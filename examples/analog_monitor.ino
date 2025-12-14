/*
 * FlipSketch Analog Monitor Example
 * Copyright (c) 2025 Trevor Tomesh
 */

// Analog monitor that can flip between the three exposed analog headers.
const int analogPinCount = 3;
int analogPinIndex = 0;            // Tracks which header is active.
int analogPin = 2;                 // Default header label 2 → PA7.
int analogPortLabel = 7;           // Companion label for display purposes.
int lastReading = -1;
int refreshCounter = 0;

void showHeader() {
    // Display the title and which header is currently selected.
    screenPrintLine(0, "Analog monitor");
    screenPrintLine(
        1,
        String("Pin ") + String(analogPin) + String(" (PA") + String(analogPortLabel) + String(")")
    );
}

void applyPinSelection() {
    // Cycle through header mappings based on the selected index.
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

    pinMode(analogPin, ANALOG);  // Switch the pin into analog sampling mode.
    lastReading = -1;
    refreshCounter = 0;          // Force the display to update on the next read.
    showHeader();
    screenPrintLine(2, "Value: -- mV");
}

void selectPreviousPin() {
    // Wrap backwards through the available analog pins.
    analogPinIndex = analogPinIndex - 1;
    if (analogPinIndex < 0) {
        analogPinIndex = analogPinCount - 1;
    }
    applyPinSelection();
}

void selectNextPin() {
    // Wrap forwards through the available analog pins.
    analogPinIndex = analogPinIndex + 1;
    if (analogPinIndex >= analogPinCount) {
        analogPinIndex = 0;
    }
    applyPinSelection();
}

void onLeftButton() {
    // Arrow left moves to the previous header.
    selectPreviousPin();
}

void onRightButton() {
    // Arrow right moves to the next header.
    selectNextPin();
}

void setup() {
    // Show button labels so Flipper routes hardware presses to the handlers.
    screenSetButtonLabels("< Prev", "", "Next >");
    applyPinSelection();
}

void loop() {
    // Sample the current analog pin and refresh the display if it moves enough.
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
