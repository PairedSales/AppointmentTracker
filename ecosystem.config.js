module.exports = {
  apps: [
    {
      name: "appraisal-tracker",
      script: "node_modules/next/dist/bin/next",
      args: "dev",
      cwd: "c:\\Users\\jeffh\\Coding Projects\\AppraisalTracker",
      watch: false, 
      env: {
        NODE_ENV: "development",
      }
    },
    {
      name: "cloudflared-tunnel",
      script: "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
      args: "tunnel run appraisal-tracker",
      cwd: "c:\\Users\\jeffh\\Coding Projects\\AppraisalTracker",
      watch: false
    }
  ]
};
