const int analogPin = 2;  // header label 2 → PA7
int lastReading = -1;
int refreshCounter = 0;

void setup() {
    pinMode(analogPin, ANALOG);
    screenPrintLine(0, "Analog monitor");
    screenPrintLine(1, String("Pin ") + String(analogPin) + " (PA7)");
}

void loop() {
    int millivolts = analogRead(analogPin);
    refreshCounter += 1;

    int diff = millivolts - lastReading;
    if (diff < 0) diff = -diff;

    if (lastReading < 0 || diff >= 5 || refreshCounter >= 10) {
        screenPrintLine(2, String("Value: ") + String(millivolts) + " mV");
        lastReading = millivolts;
        refreshCounter = 0;
    }

    delay(50);
}
