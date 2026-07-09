Phase2.md

ArunaOS

Phase 2 — Desktop Engine & Window Manager Foundation

Version: 0.1.0
Status: Approved
Depends On: Phase0.md, Phase1.md

⸻

Objective

Membangun Desktop Engine pertama ArunaOS sehingga browser mulai terasa seperti sebuah operating environment.

Phase ini berfokus pada interaksi desktop, window system, workspace, icon engine, desktop interaction, dan desktop state.

Phase ini belum mengimplementasikan AI, backend, database maupun module business.

⸻

Success Criteria

Seluruh poin berikut wajib terpenuhi.

* Desktop dapat menerima input user.
* Desktop dapat menyimpan icon.
* Window pertama dapat dibuka.
* Window dapat ditutup.
* Window dapat diminimize.
* Window dapat dimaximize.
* Window dapat dipindahkan.
* Window memiliki z-index management.
* Window memiliki focus state.
* Window memiliki animation.
* Desktop responsive.
* Tidak ada layout shift.
* Tidak ada memory leak.
* Drag berjalan pada 60 FPS.

⸻

Deliverables

* Desktop Engine
* Window Manager
* Desktop Icon System
* Window State Manager
* Workspace Engine
* Context Menu
* Selection Engine
* Overlay Layer
* Portal System
* Keyboard Shortcut Foundation

⸻

Architecture

Browser
↓
DesktopShell
↓
Desktop Engine
↓
Workspace
↓
Window Manager
↓
Window
↓
Application
↓
Component

⸻

Desktop Engine

Desktop Engine bertanggung jawab terhadap:

* Desktop Area
* Mouse Interaction
* Keyboard Interaction
* Desktop Icons
* Wallpaper Layer
* Window Layer
* Context Menu
* Selection Area

Desktop Engine tidak boleh mengetahui business logic.

⸻

Workspace

Workspace merupakan root dari seluruh aplikasi.

Workspace bertanggung jawab terhadap:

* Window Collection
* Active Window
* Desktop Icons
* Selection
* Focus
* Overlay

Workspace hanya menyimpan state.

Tidak memiliki UI.

⸻

Window Manager

Window Manager bertanggung jawab terhadap

* Create Window
* Destroy Window
* Focus Window
* Minimize
* Restore
* Maximize
* Bring To Front
* Z Index
* Window Position
* Window Size

Window Manager tidak mengetahui isi aplikasi.

⸻

Window Component

Setiap Window wajib memiliki

* Header
* Title
* Icon
* Controls
* Content
* Resize Handle

⸻

Window Controls

Harus mengikuti gaya macOS.

Support

* Close
* Minimize
* Maximize

Future

* Fullscreen
* Split View

⸻

Window States

Support

* Active
* Inactive
* Dragging
* Resizing
* Minimized
* Maximized

Future

* Fullscreen
* Snap Left
* Snap Right

⸻

Window Animation

Open

Spring

Close

Fade + Scale

Minimize

Scale + Translate

Restore

Spring

Focus

Opacity

Animation maksimal

250ms

⸻

Z Index Strategy

Window terbaru selalu berada di depan.

Click window

↓

Bring To Front

Tidak diperbolehkan melakukan sorting setiap render.

Gunakan incremental z-index.

⸻

Window Size

Default

960 x 640

Minimum

480 x 320

Maximum

Viewport

⸻

Drag System

Requirement

* GPU Accelerated
* requestAnimationFrame
* Transform Only
* No Layout Thrashing
* 60 FPS

⸻

Resize System

Support

* Right
* Bottom
* Bottom Right

Future

* All Directions

⸻

Desktop Icons

Desktop mendukung icon.

Default

* AI
* Files
* Settings

Icon dapat

* Dipilih
* Double Click
* Focus

Belum dapat dipindahkan.

⸻

Icon Layout

Grid Based

Default Grid

96 x 96

Auto Alignment

Enabled

⸻

Desktop Selection

Support

Click

Double Click

Drag Selection

Future

Multiple Selection

⸻

Context Menu

Desktop wajib memiliki context menu.

Isi awal

* New Folder
* Refresh
* Change Wallpaper
* Settings

Seluruh menu masih placeholder.

⸻

Overlay Layer

Overlay digunakan untuk

* Modal
* Context Menu
* Tooltip
* Notification
* Future AI Overlay

⸻

Portal System

Portal digunakan untuk

* Modal
* Window
* Toast
* Floating UI

⸻

Keyboard Shortcuts

Support

ESC

Close Context Menu

TAB

Focus Navigation

ENTER

Open Selected Icon

Future

Command + Space

Command Palette

⸻

Mouse Interaction

Support

Hover

Click

Double Click

Drag

Right Click

⸻

Desktop Layout

┌──────────────────────────────────────────────┐
                 Menu Bar
───────────────────────────────────────────────
AI
Files
Settings
Desktop Area
□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□
□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□
□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□
□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□
───────────────────────────────────────────────
Dock
───────────────────────────────────────────────

⸻

Folder Structure

features/
desktop/
components/
hooks/
stores/
types/
utils/
constants/
window-manager/
components/
hooks/
stores/
utils/
types/
desktop-icons/
selection/
context-menu/
workspace/
overlay/

⸻

Component Tree

DesktopShell
↓
Workspace
↓
Desktop
↓
DesktopGrid
↓
DesktopIcon
↓
WindowLayer
↓
WindowManager
↓
Window
↓
WindowContent

⸻

Zustand Stores

desktop.store.ts

* icons
* selection
* wallpaper

workspace.store.ts

* activeWorkspace
* activeWindow

window.store.ts

* windows
* focusedWindow
* zIndex

ui.store.ts

* contextMenu
* overlays

⸻

Types

Window

Workspace

DesktopIcon

Position

Size

Rectangle

Selection

Overlay

ContextMenu

⸻

Performance Rules

Tidak diperbolehkan

* Re-render seluruh Desktop ketika Window berpindah.
* Menyimpan posisi Window di React Component.
* Menggunakan top/left animation.
* Layout Thrashing.

Wajib menggunakan

* CSS Transform
* requestAnimationFrame
* Memoization
* Lazy Render

⸻

Accessibility

Keyboard Navigation

Focus Ring

ARIA

Window Title

Reduced Motion

⸻

Responsive

Desktop tetap berjalan pada

Desktop

Laptop

Tablet Landscape

Mobile hanya menampilkan halaman informasi.

Desktop Engine tidak berjalan pada smartphone.

⸻

Error Handling

Jika Window gagal dirender

↓

Tampilkan Error Boundary

↓

Desktop tetap berjalan

⸻

Testing Requirements

Desktop

* Render Test
* Interaction Test

Window

* Open Test
* Close Test
* Focus Test
* Drag Test
* Resize Test

Workspace

* State Test

Accessibility

* Keyboard Test

⸻

Exit Criteria

Phase 2 dianggap selesai apabila

* Desktop dapat menerima input.
* Desktop icon tampil.
* Window pertama berhasil dibuka.
* Window dapat ditutup.
* Window dapat dipindahkan.
* Window dapat diminimize.
* Window dapat dimaximize.
* Context menu berjalan.
* Overlay berjalan.
* Portal berjalan.
* Z-index berjalan.
* Focus berjalan.
* Keyboard shortcut dasar berjalan.
* Tidak terdapat TypeScript Error.
* Tidak terdapat ESLint Warning.
* Tidak terdapat memory leak.
* Drag berjalan stabil pada 60 FPS.

⸻

Deliverable Preview

┌──────────────────────────────────────────────────────────────────┐
                          Menu Bar
────────────────────────────────────────────────────────────────────
🖥 AI
📁 Files
⚙ Settings
┌──────────────────────────────┐
Files
● ● ●
──────────────────────────────
Window Content
└──────────────────────────────┘
────────────────────────────────────────────────────────────────────
Dock
────────────────────────────────────────────────────────────────────

⸻

Milestone Output

Pada akhir Phase 2, ArunaOS sudah memiliki identitas sebagai desktop environment.

Pengguna sudah dapat:

* Berinteraksi dengan Desktop.
* Membuka Window.
* Menutup Window.
* Memindahkan Window.
* Mengelola focus Window.
* Menggunakan Context Menu.
* Menggunakan Desktop seperti sebuah operating environment.

Business logic, AI, Authentication, Database, Plugin, Module, Voice Assistant, File System, dan Automation belum diimplementasikan dan akan menjadi fokus pada fase-fase berikutnya.