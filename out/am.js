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

function runArduinoSketch() {
    if (typeof setup === "function") {
        setup();
    }
    while (true) {
        if (typeof loop === "function") {
            loop();
        } else {
            break;
        }
    }
}

const analogPin = 2;  // header label 2 → PA7

function setup() {
    pinMode(analogPin, ANALOG);
    screenPrintLine(0, "Analog monitor");
    screenPrintLine(1, String("Pin ") + String(analogPin) + " (PA7)");
}

function loop() {
    let millivolts = analogRead(analogPin);
    screenPrintLine(2, String("Value: ") + String(millivolts) + " mV");
    delay(100);
}

runArduinoSketch();
