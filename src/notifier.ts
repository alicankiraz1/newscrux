// src/notifier.ts
import { config } from './config.js';
import * as pushover from './pushover.js';
import * as gotify from './gotify.js';

const useGotify = !!(config.gotifyUrl && config.gotifyToken);

export const sendNotification = useGotify ? gotify.sendNotification : pushover.sendNotification;
export const sendArticleNotification = useGotify ? gotify.sendArticleNotification : pushover.sendArticleNotification;
export const sendArxivDigest = useGotify ? gotify.sendArxivDigest : pushover.sendArxivDigest;
