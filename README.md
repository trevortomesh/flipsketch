# FlipSketch

FlipSketch brings Arduino-style sketching to Flipper Zero by translating `.ino` files into runnable JavaScript for the built-in scripting engine. The repo also ships with a couple of ready-made JS utilities for GPIO testing.

- `blink_led.js` &mdash; mirrors pin `PC1` onto LED pin `PC3`.
- `gpio_oscilloscope.js` &mdash; multi-channel GPIO scope drawn via the GUI widget view.
- `arduino_transpiler.js` &mdash; Node-based tool that converts a limited Arduino sketch into a runnable Flipper JS file.
- `examples/analog_monitor.ino` &mdash; reads the PA7 analog header and streams the value to the Flipper display via the transpiled screen helpers.

## Example sketch

`examples/blink.ino` illustrates the supported subset of Arduino syntax:

```cpp
const int ledPin = 13;      // maps to PC3 on Flipper
const int buttonPin = 12;   // maps to PC1 on Flipper

void setup() {
    pinMode(ledPin, OUTPUT);
    pinMode(buttonPin, INPUT_PULLDOWN);
}

void loop() {
    bool pressed = digitalRead(buttonPin);
    if (pressed) {
        digitalWrite(ledPin, HIGH);
    } else {
        digitalWrite(ledPin, LOW);
    }
    delay(50); // keep loop responsive without hogging CPU
}
```

The transpiler performs simple text substitutions:

- `int`, `float`, `bool`, etc. become `let`
- `void setup()`/`void loop()` become JS functions
- `pinMode`, `digitalWrite`, `digitalRead`, and `analogRead` are routed through the GPIO module

Complex C++ features (structs, templates, `#define`) are currently unsupported.

## Transpiling a sketch

1. Make sure Node.js is installed locally.
2. Run the transpiler:

   ```sh
   node arduino_transpiler.js examples/blink.ino out/blink.js
   ```

3. Copy the generated `out/blink.js` to your Flipper (e.g., `/ext/apps/Scripts/blink.js`).
4. Launch it from **Apps → Scripts** on the device.

The transpiled script automatically imports `gpio`, defines Arduino-style constants (`HIGH`, `LOW`, `OUTPUT`, etc.), runs `setup()` once, then loops forever invoking `loop()`. Remember to include `delay(...)` calls in your `loop()` body so the device remains responsive.

## Adapting pins

Map each silkscreened number to its actual function:

| Label | Function | JS identifier |
| ----- | -------- | ------------- |
| `1`   | 5 V rail (USB power) | `5v` *(power, not controllable)* |
| `2`   | Analog `PA7` | `pa7` |
| `3`   | Analog `PA6` | `pa6` |
| `4`   | Analog `PA4` | `pa4` |
| `5`   | GPIO `PB3` | `pb3` |
| `6`   | GPIO `PB2` | `pb2` |
| `7`   | GPIO `PC3` | `pc3` |
| `8`   | Ground | `gnd` *(common ground)* |
| `9`   | 3.3 V rail | `3v3` *(power rail)* |
| `10`  | SWC (`PB6`, SWCLK) | `pb6` |
| `11`  | Ground | `gnd` |
| `12`  | SIO (`PB7`, SWDIO) | `pb7` |
| `13`  | UART TX (`PA9`) | `pa9` |
| `14`  | UART RX (`PA10`) | `pa10` |
| `15`  | GPIO `PC1` | `pc1` |
| `16`  | GPIO `PC0` | `pc0` |
| `17`  | 1-Wire (`PB14`) | `pb14` |
| `18`  | Ground | `gnd` |

Use the textual identifiers (e.g., `"pc3"`, `"pa9"`) for the pins you actively drive or sense. Power rails and ground entries are shown for reference but cannot be toggled from JS.

## Language guide

### Syntax subset

The transpiler accepts “Arduino classic” syntax with the following rules:

- Types: `int`, `float`, `double`, `bool`, `boolean`, `const` → mapped to JS scalars.
- Functions: `void setup()` and `void loop()` required; optional helpers allowed.
- Control flow: `if`, `else`, `for`, `while`, `switch`, `break`, `continue` all pass through unchanged.
- Operators: arithmetic (`+ - * / %`), logical (`&& || !`), bitwise, comparisons (`==`, `!=`, `>=`, etc.). Prefer strict comparisons in sketches; the transpiler does not auto-convert.
- Strings: use double quotes or the provided `String(...)` helper to concatenate values.
- Unsupported features: classes, templates, references, `#define` macros (beyond simple includes), `enum class`, lambdas, and pointers.

### Transpiled runtime API

The generated JS defines a few core globals:

| API | Description |
| --- | ----------- |
| `pinMode(pin, mode)` | Initialize a pin as `OUTPUT`, `INPUT`, `INPUT_PULLUP`, `INPUT_PULLDOWN`, or `ANALOG`. |
| `digitalWrite(pin, value)` | Write `HIGH`/`LOW` (booleans) to an output. |
| `digitalRead(pin)` | Return `true/false` for digital inputs. |
| `analogRead(pin)` | Return millivolts (integer) for analog-capable pins. |
| `delay(ms)` | Sleep for the specified milliseconds (built-in on Flipper). |
| `print(...)` | Send text to the Flipper CLI (serial/UART). |
| `screenPrint(text)` | Display a single line at the top of the screen. |
| `screenPrintLine(index, text)` | Display up to three independent lines (0–2). |
| `screenClear()` | Clear all on-screen lines. |
| `String(value)` | Minimal Arduino-style string helper; converts numbers, booleans, objects to text. |

All callbacks run inside the Flipper JS event loop. The runtime automatically switches a widget view to the front so `screenPrint*` calls are visible. Use `print()` for debugging over USB and the screen helpers for on-device UX.

### Supported constants

- Digital: `HIGH`, `LOW`
- Modes: `OUTPUT`, `INPUT`, `INPUT_PULLUP`, `INPUT_PULLDOWN`, `ANALOG`
- Additional macros you define manually in your sketch (e.g., `const int ledPin = 7;`) are preserved.

### Event loop considerations

- `setup()` executes once before entering the loop.
- `loop()` runs synchronously; always include `delay()` or other throttling to keep the device responsive.
- Long-running loops without `delay` are discouraged; use modest delays (10–100 ms) or counters and only refresh the screen when values change.

### Screen helpers

- Each call to `screenPrintLine` replaces one of three reserved display rows.
- Calling `screenPrint` is shorthand for updating line 0.
- Call `screenClear` if you need to blank out old text before exiting.
- The widget view automatically returns to the Apps list when the script finishes or the user presses Back.

### Best practices

1. **Explicit types** – even though the transpiler maps everything to JS, keep using `const`, `int`, `bool`, etc. for readability.
2. **Avoid dynamic memory** – the runtime does not support `new`/`delete`.
3. **One sketch = one script** – each `.ino` should declare its own `setup/loop`.
4. **Use `String(...)` or `snprintf`** when mixing numbers into messages to avoid implicit conversions.
5. **Clamp sampling rate** – for analog/digital monitors, only update when values change to prevent GUI overload.
