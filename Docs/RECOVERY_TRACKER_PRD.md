\# Recovery Tracker



\## Project Overview



Build a modern, mobile-first Progressive Web Application (PWA) for tracking undesirable habits (or any recurring activity) by recording individual occurrences throughout the day.



The application should help users visualize their progress through calendars, heatmaps, graphs, and statistics.



The UI should be inspired by Habstick (clean, minimal, rounded cards, spacious layout), but it must NOT copy Habstick's design.



The application should primarily be optimized for mobile browsers but work well on desktop browsers.



\---



\# Technical Requirements



\* HTML

\* CSS

\* Vanilla JavaScript (ES6+)

\* Chart.js for graphs

\* Progressive Web App (PWA)

\* Deployable directly to GitHub Pages



No backend server.



No Firebase.



No database server.



\---



\# Storage \& Synchronization



Use a hybrid storage approach:



\## Local Cache



\* Save all data immediately to LocalStorage.

\* Application should work completely offline.



\## Cross-Device Synchronization



Use a Private GitHub Gist.



The application should:



\* Ask for GitHub Personal Access Token during first account creation.

\* Automatically create and manage a private GitHub Gist.

\* Store the Gist ID internally.

\* Synchronize LocalStorage with the Gist.



The user should never manually create or manage Gists.



Whenever data changes:



1\. Save to LocalStorage.

2\. Attempt Gist synchronization.

3\. If offline, mark pending sync and retry later.



When opening the application on another device:



\* User selects "Restore Existing Account".

\* Enters Username, Password, and GitHub PAT.

\* Application automatically locates the Recovery Tracker Gist.

\* Downloads and restores all data.



\---



\# Authentication



Simple local authentication.



First Launch:



\* Username

\* Password

\* Confirm Password

\* GitHub Personal Access Token



Future Logins:



\* Username

\* Password



Passwords should never be stored as plain text.



Hash them before saving.



No OTP.



No Email Verification.



No Firebase Authentication.



\---



\# Habits



Support multiple habits.



If exactly one habit exists:



\* Open directly into that habit.



If more than one habit exists:



\* Open Home Page.



A Home button should always be available.



Each habit contains:



\* Name

\* Emoji Icon

\* Optional Description

\* Threshold



Default threshold:



0



User may change threshold from:



0-100



\---



\# Entries



Pressing + should open a small modal.



Fields:



Time



(Default: current system time)



User may modify the time.



If user simply presses Save:



Store the current system time.



Each entry stores:



\* Date

\* Time



Entries should be editable and deletable.



\---



\# Calendar



Month navigation required.



Previous Month < >



Current Month



Next Month >



Future dates:



\* Visible

\* Faded opacity

\* Non-clickable



Every day cell MUST display:



\* Background color

\* Occurrence counter



Example:



Green:

(empty)



Amber:

1



Light Red:

3



Dark Red:

7



Counter should be centered inside the cell.



Color scale:



0 → Green



1 → Amber



2-3 → Light Red



4-100 → Dark Red



\---



\# Statistics



Dashboard should include:



\* Current Streak

\* Longest Streak

\* Occurrences This Month

\* Clean Days

\* Success Percentage

\* Average Occurrences Per Day

\* Last Occurrence Date



Support:



\* Weekly

\* Monthly

\* Yearly

\* All Time



\---



\# Graphs



Generate:



\## Daily Trend



Line graph showing occurrences over time.



\## Monthly Comparison



Bar graph showing total occurrences each month.



\## Heatmap Calendar



GitHub-style heatmap.



Every heatmap square should also display the occurrence count.



\---



\# Settings



Include:



\* Edit Habit

\* Change Password

\* Export JSON

\* Import JSON

\* Sync Now

\* Logout

\* Reset Data

\* About



\---



\# PWA Requirements



Application should support:



\* Install to Home Screen

\* Offline operation

\* Service Worker

\* Web Manifest

\* Custom App Icon



Should behave similarly to a native mobile application.



\---



\# Deliverables



Generate complete production-ready code.



Generate these documentation files:



\* README.md

\* SETUP\_GUIDE.md

\* ARCHITECTURE.md



README.md should be suitable for publishing directly to GitHub.



SETUP\_GUIDE.md should explain every step from code generation to deployment, synchronization setup, GitHub Pages hosting, PWA installation, and multi-device testing.



ARCHITECTURE.md should explain the project structure, synchronization flow, LocalStorage cache, GitHub Gist integration, authentication flow, and data model.



Generate clean, modular, maintainable code.



Do not leave placeholder TODOs.



The project should be usable immediately after following the setup guide.



