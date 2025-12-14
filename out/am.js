let eventLoop = require("event_loop");
let gui = require("gui");
let widgetView = require("gui/widget");
let gpio = require("gpio");
const HIGH = true;
const LOW = false;
const OUTPUT = "output";
const INPUT = "input";
const INPUT_PULLUP = "input_pullup";
const INPUT_PULLDOWN = "input_pulldown";
const ANALOG = "analog";

function String(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return value.toString();
    if (typeof value === "object" && value !== null && typeof value.toString === "function") {
        return value.toString();
    }
    return JSON.stringify(value);
}

let __pins = {};
const __pinMap = {
    "2": "pa7",
    "3": "pa6",
    "4": "pa4",
    "5": "pb3",
    "6": "pb2",
    "7": "pc3",
    "10": "pb6",
    "12": "pb7",
    "13": "pa9",
    "14": "pa10",
    "15": "pc1",
    "16": "pc0",
    "17": "pb14"
};

let __screenView = widgetView.make();
gui.viewDispatcher.switchTo(__screenView);
let __screenLines = ["", "", ""];
let __sketchRuntime = { running: true };
let __buttonLabels = { left: "", center: "", right: "" };

function __renderScreen() {
    let children = [];
    for (let i = 0; i < __screenLines.length; i += 1) {
        if (__screenLines[i] && __screenLines[i].length > 0) {
            children.push({
                element: "string",
                x: 4,
                y: 12 + i * 16,
                align: "tl",
                font: "secondary",
                text: __screenLines[i]
            });
        }
    }
    if (__buttonLabels.left && __buttonLabels.left.length > 0) {
        children.push({ element: "button", button: "left", text: __buttonLabels.left });
    }
    if (__buttonLabels.center && __buttonLabels.center.length > 0) {
        children.push({ element: "button", button: "center", text: __buttonLabels.center });
    }
    if (__buttonLabels.right && __buttonLabels.right.length > 0) {
        children.push({ element: "button", button: "right", text: __buttonLabels.right });
    }
    __screenView.setChildren(children);
    gui.viewDispatcher.sendTo("front");
}

function screenClear() {
    __screenLines = ["", "", ""];
    __renderScreen();
}

function screenPrintLine(index, text) {
    if (index < 0 || index >= __screenLines.length) return;
    __screenLines[index] = String(text);
    __renderScreen();
}

function screenPrint(text) {
    screenPrintLine(0, text);
}

function screenSetButtonLabels(left, center, right) {
    __buttonLabels.left = left || "";
    __buttonLabels.center = center || "";
    __buttonLabels.right = right || "";
    __renderScreen();
}

function stopSketch() {
    if (!__sketchRuntime.running) {
        return;
    }
    __sketchRuntime.running = false;
    eventLoop.stop();
}

function __normalizePin(name) {
    let str = typeof name === "number" ? name.toString() : "" + name;
    str = str.toLowerCase();
    if (__pinMap[str]) {
        return __pinMap[str];
    }
    return str;
}

function __getPin(name) {
    let normalized = __normalizePin(name);
    if (!__pins[normalized]) {
        __pins[normalized] = gpio.get(normalized);
    }
    return __pins[normalized];
}

function pinMode(name, mode) {
    let pin = __getPin(name);
    if (mode === OUTPUT) {
        pin.init({ direction: "out", outMode: "push_pull" });
    } else if (mode === INPUT_PULLUP) {
        pin.init({ direction: "in", inMode: "plain_digital", pull: "up" });
    } else if (mode === INPUT_PULLDOWN) {
        pin.init({ direction: "in", inMode: "plain_digital", pull: "down" });
    } else if (mode === ANALOG) {
        pin.init({ direction: "in", inMode: "analog" });
    } else {
        pin.init({ direction: "in", inMode: "plain_digital", pull: "down" });
    }
}

function digitalWrite(name, value) {
    let pin = __getPin(name);
    pin.write(value === HIGH || value === true);
}

function digitalRead(name) {
    let pin = __getPin(name);
    return pin.read();
}

function analogRead(name) {
    let pin = __getPin(name);
    return pin.readAnalog();
}

function __dispatchButtonEvent(event) {
    if (!event || event.type !== "short") return;
    let key = event.key;
    if (key === "left" && typeof onLeftButton === "function") {
        onLeftButton(event.type, event);
    } else if (key === "right" && typeof onRightButton === "function") {
        onRightButton(event.type, event);
    } else if (key === "up" && typeof onUpButton === "function") {
        onUpButton(event.type, event);
    } else if (key === "down" && typeof onDownButton === "function") {
        onDownButton(event.type, event);
    } else if ((key === "center" || key === "ok") && typeof onCenterButton === "function") {
        onCenterButton(event.type, event);
    } else if (key === "back" && typeof onBackButton === "function") {
        onBackButton(event.type, event);
    }
}

function runArduinoSketch() {
    if (typeof setup === "function") {
        setup();
    }

    __sketchRuntime.running = true;

    let loopTimer = eventLoop.timer("periodic", 1);
    let loopSubscription = eventLoop.subscribe(loopTimer, function (_sub, _item, runtime) {
        if (!runtime.running) {
            return [runtime];
        }
        if (typeof loop === "function") {
            loop();
        } else {
            stopSketch();
        }
        return [runtime];
    }, __sketchRuntime);

    let buttonSubscription = null;
    if (__screenView.button) {
        buttonSubscription = eventLoop.subscribe(__screenView.button, function (_sub, event, runtime) {
            if (!runtime.running) {
                return [runtime];
            }
            __dispatchButtonEvent(event);
            return [runtime];
        }, __sketchRuntime);
    }

    let navigationSubscription = eventLoop.subscribe(gui.viewDispatcher.navigation, function (_sub, _item, runtime) {
        stopSketch();
        return [runtime];
    }, __sketchRuntime);

    eventLoop.run();

    loopSubscription.cancel();
    if (buttonSubscription) {
        buttonSubscription.cancel();
    }
    navigationSubscription.cancel();
    gui.viewDispatcher.sendTo("back");
}

const analogPinCount = 3;
let analogPinIndex = 0;
let analogPin = 2;        // default header label 2 → PA7
let analogPortLabel = 7;  // PA7
let lastReading = -1;
let refreshCounter = 0;

function showHeader() {
    screenPrintLine(0, "Analog monitor");
    screenPrintLine(
        1,
        String("Pin ") + String(analogPin) + String(" (PA") + String(analogPortLabel) + String(")")
    );
}

function applyPinSelection() {
    if (analogPinIndex <= 0) {
        analogPin = 2;
        analogPortLabel = 7;
    } else if (analogPinIndex < 2) {
        analogPin = 3;
        analogPortLabel = 6;
    } else {
        analogPin = 4;
        analogPortLabel = 4;
    }

    pinMode(analogPin, ANALOG);
    lastReading = -1;
    refreshCounter = 0;
    showHeader();
    screenPrintLine(2, "Value: -- mV");
}

function selectPreviousPin() {
    analogPinIndex = analogPinIndex - 1;
    if (analogPinIndex < 0) {
        analogPinIndex = analogPinCount - 1;
    }
    applyPinSelection();
}

function selectNextPin() {
    analogPinIndex = analogPinIndex + 1;
    if (analogPinIndex >= analogPinCount) {
        analogPinIndex = 0;
    }
    applyPinSelection();
}

function onLeftButton() {
    selectPreviousPin();
}

function onRightButton() {
    selectNextPin();
}

function setup() {
    screenSetButtonLabels("< Prev", "", "Next >");
    applyPinSelection();
}

function loop() {
    let millivolts = analogRead(analogPin);
    refreshCounter = refreshCounter + 1;

    let diff = millivolts - lastReading;
    if (diff < 0) diff = -diff;

    if (lastReading < 0 || diff >= 5 || refreshCounter >= 10) {
        screenPrintLine(2, String("Value: ") + String(millivolts) + " mV");
        lastReading = millivolts;
        refreshCounter = 0;
    }

    delay(50);
}

runArduinoSketch();
