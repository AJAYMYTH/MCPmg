import fs from 'fs';
import path from 'path';
import os from 'os';

export class BackupManager {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(os.homedir(), '.mcpmg', 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Pre-creates the target backup file path before writing
   */
  public prepareBackupPath(hostId: string, originalPath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(originalPath) || '.json';
    const filename = `${timestamp}_${hostId}_${path.basename(originalPath, ext)}${ext}`;
    return path.join(this.backupDir, filename);
  }

  /**
   * Creates a timestamped backup of the target config file
   */
  public createBackup(hostId: string, targetPath: string): string | null {
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    try {
      const backupPath = this.prepareBackupPath(hostId, targetPath);
      const content = fs.readFileSync(targetPath, 'utf8');
      fs.writeFileSync(backupPath, content, 'utf8');
      return backupPath;
    } catch (err) {
      console.error(`Warning: Failed to create backup for ${targetPath}:`, err);
      return null;
    }
  }

  /**
   * Lists all existing backups
   */
  public listBackups(): Array<{ path: string; name: string; date: Date; size: number }> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const files = fs.readdirSync(this.backupDir);
    return files
      .map((file) => {
        const fullPath = path.join(this.backupDir, file);
        const stat = fs.statSync(fullPath);
        return {
          path: fullPath,
          name: file,
          date: stat.mtime,
          size: stat.size,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Restores a backup file to its target destination
   */
  public restoreBackup(backupFilePath: string, targetConfigPath: string): boolean {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file does not exist: ${backupFilePath}`);
    }

    // First backup current state before restoring
    this.createBackup('pre_restore', targetConfigPath);

    const content = fs.readFileSync(backupFilePath, 'utf8');
    fs.writeFileSync(targetConfigPath, content, 'utf8');
    return true;
  }
}

export const backupManager = new BackupManager();
