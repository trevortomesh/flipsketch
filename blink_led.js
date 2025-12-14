let eventLoop = require("event_loop");
let gpio = require("gpio");

let led = gpio.get("pc3");
let input = gpio.get("pc1");

led.init({ direction: "out", outMode: "push_pull" });
input.init({ direction: "in", inMode: "plain_digital", pull: "down" });

let pollTimer = eventLoop.timer("periodic", 20);

eventLoop.subscribe(pollTimer, function (_subscription, _item, ledPin, inputPin) {
    let isHigh = inputPin.read();
    ledPin.write(isHigh);
    return [ledPin, inputPin];
}, led, input);

eventLoop.run();
