const int analogPinCount = 3;
int analogPinIndex = 0;
int analogPin = 2;        // default header label 2 → PA7
int analogPortLabel = 7;  // PA7
int lastReading = -1;
int refreshCounter = 0;

void showHeader() {
    screenPrintLine(0, "Analog monitor");
    screenPrintLine(
        1,
        String("Pin ") + String(analogPin) + String(" (PA") + String(analogPortLabel) + String(")")
    );
}

void applyPinSelection() {
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

void selectPreviousPin() {
    analogPinIndex = analogPinIndex - 1;
    if (analogPinIndex < 0) {
        analogPinIndex = analogPinCount - 1;
    }
    applyPinSelection();
}

void selectNextPin() {
    analogPinIndex = analogPinIndex + 1;
    if (analogPinIndex >= analogPinCount) {
        analogPinIndex = 0;
    }
    applyPinSelection();
}

void onLeftButton() {
    selectPreviousPin();
}

void onRightButton() {
    selectNextPin();
}

void setup() {
    screenSetButtonLabels("< Prev", "", "Next >");
    applyPinSelection();
}

void loop() {
    int millivolts = analogRead(analogPin);
    refreshCounter = refreshCounter + 1;

    int diff = millivolts - lastReading;
    if (diff < 0) diff = -diff;

    if (lastReading < 0 || diff >= 5 || refreshCounter >= 10) {
        screenPrintLine(2, String("Value: ") + String(millivolts) + " mV");
        lastReading = millivolts;
        refreshCounter = 0;
    }

    delay(50);
}
