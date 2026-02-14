import { clipboard, nativeImage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { loadSettings } from './settings-management';

// Interval for checking clipboard (ms)
const CLIPBOARD_CHECK_INTERVAL = 500;

// Minimum content length to save (avoid saving very short snippets)
const MIN_CONTENT_LENGTH = 3;

// Supported image extensions
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];

// Store the last content hash to detect changes
let lastTextHash: string | null = null;
let lastImageHash: string | null = null;

// Timer reference for the watcher
let watcherInterval: NodeJS.Timeout | null = null;

/**
 * Generate MD5 hash of content
 * @param content - Content to hash
 * @returns MD5 hash string
 */
function hashContent(content: string | Buffer): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get the clipboard history directory from settings
 * Returns null if no save location is configured
 * @returns The clipboard history directory path, or null if not configured
 */
function getClipboardHistoryDir(): string | null {
  const settings = loadSettings();
  if (settings.clipboardHistorySaveLocation && fs.existsSync(settings.clipboardHistorySaveLocation)) {
    return settings.clipboardHistorySaveLocation;
  }
  return null;
}

/**
 * Ensure the clipboard history directory exists
 * @param dir - Directory path to ensure exists
 */
function ensureClipboardHistoryDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate a UUID v4 using crypto
 * @returns UUID string
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Save text content to clipboard history
 * @param text - Text content to save
 * @param dir - Directory to save to
 */
function saveTextContent(text: string, dir: string): void {
  ensureClipboardHistoryDir(dir);
  const id = generateUUID();
  const fileName = `${id}.txt`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, text, 'utf-8');
}

/**
 * Save image content to clipboard history
 * @param image - Native image from clipboard
 * @param dir - Directory to save to
 */
function saveImageContent(image: Electron.NativeImage, dir: string): void {
  ensureClipboardHistoryDir(dir);

  // Generate timestamp-based filename
  const timestamp = Date.now();

  // Try to determine the best format (PNG by default)
  const pngBuffer = image.toPNG();
  const fileName = `${timestamp}.png`;
  const filePath = path.join(dir, fileName);

  fs.writeFileSync(filePath, pngBuffer);
}

/**
 * Check and save clipboard text content
 * @param dir - Directory to save to
 */
function checkAndSaveText(dir: string): void {
  const text = clipboard.readText();

  if (!text || text.length < MIN_CONTENT_LENGTH) {
    return;
  }

  const currentHash = hashContent(text);

  // Skip if same as last content
  if (currentHash === lastTextHash) {
    return;
  }

  lastTextHash = currentHash;

  // Save the text
  saveTextContent(text, dir);
}

/**
 * Check and save clipboard image content
 * @param dir - Directory to save to
 */
function checkAndSaveImage(dir: string): void {
  const image = clipboard.readImage();

  if (image.isEmpty()) {
    return;
  }

  // Get PNG buffer for hashing
  const pngBuffer = image.toPNG();
  const currentHash = hashContent(pngBuffer);

  // Skip if same as last content
  if (currentHash === lastImageHash) {
    return;
  }

  lastImageHash = currentHash;

  // Save the image
  saveImageContent(image, dir);
}

/**
 * Check clipboard for new content and save if detected
 */
function checkClipboard(): void {
  const dir = getClipboardHistoryDir();
  if (!dir) {
    return; // No save location configured
  }

  // Check text first (more common)
  checkAndSaveText(dir);

  // Then check image
  checkAndSaveImage(dir);
}

/**
 * Start the clipboard watcher
 * Begins monitoring clipboard for changes
 */
export function startClipboardWatcher(): void {
  if (watcherInterval) {
    return; // Already running
  }

  // Initialize hashes with current clipboard content
  const currentText = clipboard.readText();
  if (currentText && currentText.length >= MIN_CONTENT_LENGTH) {
    lastTextHash = hashContent(currentText);
  }

  const currentImage = clipboard.readImage();
  if (!currentImage.isEmpty()) {
    lastImageHash = hashContent(currentImage.toPNG());
  }

  // Start polling
  watcherInterval = setInterval(checkClipboard, CLIPBOARD_CHECK_INTERVAL);
  console.log('Clipboard watcher started');
}

/**
 * Stop the clipboard watcher
 * Stops monitoring clipboard for changes
 */
export function stopClipboardWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log('Clipboard watcher stopped');
  }
}

/**
 * Check if clipboard watcher is running
 * @returns True if watcher is running
 */
export function isClipboardWatcherRunning(): boolean {
  return watcherInterval !== null;
}
