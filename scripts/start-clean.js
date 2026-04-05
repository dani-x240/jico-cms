#!/usr/bin/env node
const { exec } = require('child_process');
const path = require('path');

function runCommand(cmd, opts = {}){
  return new Promise((resolve) => {
    const p = exec(cmd, opts, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
    p.stdout && p.stdout.pipe(process.stdout);
    p.stderr && p.stderr.pipe(process.stderr);
  });
}

async function killNodeProcesses(){
  console.log('Attempting to stop node processes (best-effort)...');
  try{
    if (process.platform === 'win32'){
      // Windows
      const { err } = await runCommand('taskkill /F /IM node.exe');
      if (err) console.warn('taskkill failed or not available:', err.message || err);
    } else {
      // macOS / Linux
      const { err } = await runCommand('pkill -f node || true');
      if (err) console.warn('pkill returned error (may be fine):', err.message || err);
    }
  } catch(e){
    console.warn('Failed to run kill command:', e.message || e);
  }
}

async function startDev(){
  // Run npm start in cwd
  console.log('Starting dev server (npm start)...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = exec(`${npmCmd} start`, { cwd: process.cwd(), env: process.env });
  if (child.stdout) child.stdout.pipe(process.stdout);
  if (child.stderr) child.stderr.pipe(process.stderr);
  child.on('close', (code) => {
    console.log(`Dev server exited with code ${code}`);
    process.exit(code);
  });
}

(async function main(){
  await killNodeProcesses();
  await startDev();
})();
