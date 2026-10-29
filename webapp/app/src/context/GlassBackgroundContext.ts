import { createContext, RefObject } from 'react';
import type { ViewInstance } from 'react-native';

export const GlassBackgroundContext = createContext<RefObject<ViewInstance | null> | undefined>(undefined);
