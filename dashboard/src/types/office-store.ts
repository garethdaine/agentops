/** Camera control mode for the 3D scene. */
export type CameraMode = 'orbit' | 'wasd';

/** Weather condition types for the environment system. */
export type Weather = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'showers' | 'thunderstorm';

/** Playback state for session replay. */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/** Agent visual state within the 3D scene. */
export type AgentVisualState = 'idle' | 'walking' | 'sitting' | 'typing' | 'reading' | 'chatting' | 'waiting';
