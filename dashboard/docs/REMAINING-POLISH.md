# Remaining UI Polish Issues

## Critical

### 1. Skybox is white
- The drei `<Sky>` component renders but appears white
- Tried: distance 450000 (clipped by camera far), distance 500 (still white), scene.background=null (transparent)
- **Root cause unknown** -- needs debugging in browser DevTools: is the Sky mesh in the scene graph? Is it rendering? Is it behind the ground plane?
- Possible fix: use `scene.background = new CubeTextureLoader()` instead of Sky mesh, or set Sky as scene background via `scene.background = sky.material`

### 2. Breakout element positioning
- Weather widget, fullscreen button, status bar, and slide-in panels need to break out ~10-15px from canvas corners
- Currently using negative offsets that overshoot
- All elements positioned with `position: absolute` relative to `<main>`
- Need: weather top-left corner, fullscreen top-right corner, status bar bottom edge, panels right side -- each extending ~12px past the canvas border into the main padding
- The canvas wrapper has `rounded-xl` border -- breakout elements should overlap the rounded corners slightly

### 3. Slide-in panels
- Agent panel and zone panels should use identical component/styling
- Panels should have gap at top (below fullscreen button) and bottom (above status bar)
- Right edge should align with fullscreen button's right edge
- Currently panels render inside OfficeScene component -- may need to lift state to page.tsx

## High

### 4. Speech bubbles not visible
- SpeechBubble.tsx component exists with canvas texture + sprite
- BubbleManager is created in OfficeScene but may not be rendering sprites in the scene
- Need to verify the sprite meshes are added to the R3F scene graph

### 5. Agent responses not in Events tab
- Telemetry hook now captures `content` field for Notification and PostToolUse events
- Dashboard EventEntry component shows content when present
- But telemetry events written BEFORE the hook update don't have content
- New events should show content -- verify by checking telemetry.jsonl for content field

### 6. Particle effects not firing
- ParticleEmitter component exists and is mounted in OfficeScene
- But no events trigger particle emission (no success/failure callbacks wired)
- Need to wire agent event changes to particle emit calls

## Medium

### 7. Agent avatar legs below floor
- Avatar Y position raised by 0.25 but may still clip
- Sitting pose animation should position avatar at desk height

### 8. Sidebar collapse button
- Back arrow button in header works but sidebar collapse button at bottom needs testing

### 9. Session dropdown shows raw UUIDs
- Should show "Session 1", "Session 2" or project name

### 10. Stale subagent cleanup
- Build subagents linger as idle avatars
- Need shorter timeout for general-purpose type agents
