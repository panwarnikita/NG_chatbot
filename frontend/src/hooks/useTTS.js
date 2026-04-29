import { useMemo } from 'react';
import { usePiper } from './text-to-speech_hook';
import { useWebSpeech } from './useWebSpeech';
import { detectTTSEngine } from '../utils/ttsEngine';

// Selector hook that picks Piper or Web Speech once per session and exposes
// the active engine's state under a unified interface. Both child hooks are
// always called (Rules of Hooks) but the inactive one receives `null` config
// and short-circuits before doing any work.

export const useTTS = (config) => {
    const engine = useMemo(() => detectTTSEngine(), []);

    const piper = usePiper(engine === 'piper' ? config : null);
    const webspeech = useWebSpeech(engine === 'webspeech' ? config : null);

    const active = engine === 'piper' ? piper : webspeech;
    return { ...active, engine };
};
