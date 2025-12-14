const int ledPin = 7;      // header label 7 → PC3
const int buttonPin = 15;  // header label 15 → PC1

void setup() {
    pinMode(ledPin, OUTPUT);
    pinMode(buttonPin, INPUT_PULLDOWN);
    print("LED connected to header pin " + String(ledPin) + " (PC3)");
    print("Button connected to header pin " + String(buttonPin) + " (PC1)");
}

bool lastState = false;

void loop() {
    bool pressed = digitalRead(buttonPin);
    bool changed = (pressed && !lastState) || (!pressed && lastState);
    if (changed) {
        if (pressed) {
            print("Button pressed");
        } else {
            print("Button released");
        }
        lastState = pressed;
    }
    if (pressed) {
        digitalWrite(ledPin, HIGH);
    } else {
        digitalWrite(ledPin, LOW);
    }
    delay(50);
}
