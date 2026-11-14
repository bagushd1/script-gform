# War GForm Timer

A lightweight, 100% client-side tool designed to automatically submit Google Forms at an exact scheduled time with millisecond precision. Zero backend, no Node.js runtime required, and zero dependencies.

---

## Features

- **100% Client-Side (Serverless)**: Self-contained in a single `index.html` file. Can be run locally by opening the file or hosted on GitHub Pages.
- **Automatic Form Parser**: Simply paste the Google Form source HTML (`Ctrl + U`), and the tool will automatically extract field names, input fields, and dropdown options without needing to inspect `entry.ID`s manually.
- **High-Precision Scheduler**: Polls local system time every 50 milliseconds to trigger the submission at the exact target second.
- **Screen Wake Lock API**: Automatically prevents your device screen from sleeping or auto-locking while the timer is running (supported on modern browsers).
- **Interactive Visual Status**: Animated pulsing orange indicator when standing by, turning green instantly upon successful form submission.
- **CORS Bypass**: Posts form responses via a hidden iframe directly to the Google Form `/formResponse` endpoint.

---

## Usage

### 1. On Desktop / Laptop

1. Open `index.html` directly in any web browser (Chrome, Edge, Firefox, Safari).
2. Open the target Google Form in a new tab, then press **Ctrl + U** (or right-click > **View Page Source**).
3. Select all source code (**Ctrl + A**) and copy it (**Ctrl + C**).
4. Return to the **War GForm Timer** tab and paste the code into the *"Paste Source HTML Google Form"* box, then click **Ekstrak Form**.
5. The form questions will appear automatically. Fill in your desired answers.
6. Set your target target time (Hour : Minute : Second).
7. Click **Pasang Timer** and keep the tab active.

### 2. On Mobile (Android / iOS)

1. Open the page in your mobile browser (or through your deployed GitHub Pages link).
2. On Chrome Android, open the Google Form tab and prepend `view-source:` to the address bar (e.g., `view-source:https://docs.google.com/forms/d/e/...`).
3. Select all the source text, copy it, and paste it into the timer page.
4. Fill in your answers, set the scheduled time, and tap **Pasang Timer**.
5. **Note:** Keep the browser tab open and active on screen until the target time arrives.

---

## Running Self-Checks

To run the automated assertion tests for the URL normalizer and source parser:

```bash
node test.js
```

---

## Limitations

- **Active Tab Required**: Because mobile operating systems (iOS/Android) freeze background JavaScript to conserve battery, the browser tab must remain open and visible on screen.
- **Authentication & CAPTCHA**: This tool works with public Google Forms. Forms that require Google Account sign-in or use reCAPTCHA challenges cannot be automated via background HTTP POST.
- **Clock Accuracy**: The submission triggers based on your device's local system clock. Ensure your device clock is synchronized with internet time (NTP).
