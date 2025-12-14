let eventLoop = require("event_loop");
let gui = require("gui");
let widgetView = require("gui/widget");
let gpio = require("gpio");
let math = require("math");

const SAMPLE_HISTORY = 96;
const REFRESH_INTERVAL_MS = 50;
const MAX_ANALOG_MV = 3300;
const SCREEN = { width: 128, height: 64 };
const PLOT = {
    left: 18,
    right: 122,
    top: 12,
    bottom: 14
};

const PIN_DEFINITIONS = [
    { pin: "pa6", label: "PA6", mode: "analog" },
    { pin: "pa7", label: "PA7", mode: "analog" },
    { pin: "pb2", label: "PB2", mode: "digital" },
    { pin: "pb3", label: "PB3", mode: "digital" },
    { pin: "pc0", label: "PC0", mode: "digital" },
    { pin: "pc1", label: "PC1", mode: "digital" },
    { pin: "pc3", label: "PC3", mode: "digital" }
];

function initializeChannel(definition) {
    let pin = gpio.get(definition.pin);
    let analogPreferred = definition.mode === "analog";
    let analogEnabled = analogPreferred;

    if (analogPreferred) {
        pin.init({ direction: "in", inMode: "analog" });
    } else {
        pin.init({ direction: "in", inMode: "plain_digital", pull: "down" });
    }

    let samples = [];
    for (let i = 0; i < SAMPLE_HISTORY; i += 1) {
        samples.push(0);
    }

    return {
        label: definition.label,
        pin: pin,
        analog: analogEnabled,
        maxMv: definition.maxMv || MAX_ANALOG_MV,
        samples: samples
    };
}

function sampleChannels(channels) {
    for (let i = 0; i < channels.length; i += 1) {
        let channel = channels[i];
        let sample = 0;

        if (channel.analog) {
            let mv = channel.pin.readAnalog();
            sample = mv / channel.maxMv;
        } else {
            sample = channel.pin.read() ? 1 : 0;
        }

        if (sample < 0) sample = 0;
        if (sample > 1) sample = 1;

        channel.samples.push(sample);
        if (channel.samples.length > SAMPLE_HISTORY) {
            channel.samples.shift();
        }
    }
}

function render(state) {
    let children = [];
    let header = state.paused ? "GPIO Scope (Paused)" : "GPIO Scope";
    children.push({
        element: "string",
        x: SCREEN.width / 2,
        y: 6,
        align: "tm",
        font: "secondary",
        text: header
    });

    let chartWidth = PLOT.right - PLOT.left;
    let chartHeight = SCREEN.height - PLOT.top - PLOT.bottom;
    let rowHeight = math.max(6, math.floor(chartHeight / state.channels.length));
    let amplitude = math.max(2, rowHeight - 2);
    let xScale = chartWidth / (SAMPLE_HISTORY - 1);

    for (let idx = 0; idx < state.channels.length; idx += 1) {
        let channel = state.channels[idx];
        let rowTop = PLOT.top + idx * rowHeight;
        let baseY = rowTop + math.floor(rowHeight / 2);
        let highY = baseY - math.floor(amplitude / 2);
        let lowY = baseY + math.floor(amplitude / 2);
        if (highY < PLOT.top) highY = PLOT.top;
        if (lowY > SCREEN.height - PLOT.bottom) lowY = SCREEN.height - PLOT.bottom;

        children.push({
            element: "string",
            x: 4,
            y: baseY,
            align: "lm",
            font: "secondary",
            text: channel.label + (channel.analog ? " (A)" : " (D)")
        });

        children.push({
            element: "line",
            x1: PLOT.left,
            y1: baseY,
            x2: PLOT.right,
            y2: baseY
        });

        for (let sampleIdx = 1; sampleIdx < channel.samples.length; sampleIdx += 1) {
            let previous = channel.samples[sampleIdx - 1];
            let current = channel.samples[sampleIdx];
            let x1 = math.round(PLOT.left + (sampleIdx - 1) * xScale);
            let x2 = math.round(PLOT.left + sampleIdx * xScale);
            let y1 = math.round(lowY - previous * (lowY - highY));
            let y2 = math.round(lowY - current * (lowY - highY));

            children.push({ element: "line", x1: x1, y1: y1, x2: x2, y2: y2 });
        }
    }

    children.push({ element: "button", button: "left", text: state.paused ? "Resume" : "Pause" });
    children.push({ element: "button", button: "center", text: "Clear" });
    children.push({ element: "button", button: "right", text: "Exit" });

    state.view.setChildren(children);
}

function buildState() {
    let channels = [];
    for (let i = 0; i < PIN_DEFINITIONS.length; i += 1) {
        channels.push(initializeChannel(PIN_DEFINITIONS[i]));
    }

    return {
        channels: channels,
        paused: false,
        view: widgetView.make()
    };
}

function main() {
    let state = buildState();
    gui.viewDispatcher.switchTo(state.view);
    render(state);

    let timerContract = eventLoop.timer("periodic", REFRESH_INTERVAL_MS);
    let timerSubscription = eventLoop.subscribe(timerContract, function (_sub, _item, state) {
        if (!state.paused) {
            sampleChannels(state.channels);
            render(state);
        }
        return [state];
    }, state);

    let buttonSubscription = eventLoop.subscribe(state.view.button, function (_sub, event, state, timer) {
        if (!event || event.type !== "short") return [state, timer];

        if (event.key === "left") {
            state.paused = !state.paused;
        } else if (event.key === "center") {
            for (let i = 0; i < state.channels.length; i += 1) {
                let freshSamples = [];
                for (let j = 0; j < SAMPLE_HISTORY; j += 1) {
                    freshSamples.push(0);
                }
                state.channels[i].samples = freshSamples;
            }
        } else if (event.key === "right") {
            eventLoop.stop();
        }

        render(state);
        return [state, timer];
    }, state, timerSubscription);

    let navigationSubscription = eventLoop.subscribe(gui.viewDispatcher.navigation, function (_sub, _item, loop) {
        loop.stop();
    }, eventLoop);

    eventLoop.run();

    timerSubscription.cancel();
    buttonSubscription.cancel();
    navigationSubscription.cancel();
    gui.viewDispatcher.sendTo("back");
}

main();
