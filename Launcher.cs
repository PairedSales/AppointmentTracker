using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace AppraisalTrackerLauncher
{
    public class AppContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process serverProcess;
        private Mutex mutex;
        private string appUrl = "http://localhost:3000";
        private string projectDir = @"c:\Users\jeffh\Coding Projects\AppraisalTracker";

        public AppContext()
        {
            Log("=== LAUNCHER STARTING ===");

            // 1. Ensure single instance of this launcher
            bool createdNew;
            mutex = new Mutex(true, "AppraisalTrackerLauncherMutex", out createdNew);
            if (!createdNew)
            {
                Log("Launcher is already running. Opening browser in existing instance and exiting.");
                OpenBrowser();
                Environment.Exit(0);
            }

            // 2. Initialize Tray Icon
            trayIcon = new NotifyIcon();
            string iconPath = Path.Combine(projectDir, @"src\app\favicon.ico");
            if (File.Exists(iconPath))
            {
                try {
                    trayIcon.Icon = new Icon(iconPath);
                } catch (Exception ex) {
                    Log("Failed to load icon file: " + ex.Message);
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.Text = "Appraisal Tracker Server";
            trayIcon.Visible = true;

            // Context Menu
            var contextMenu = new ContextMenu();
            contextMenu.MenuItems.Add("Open Dashboard", (s, e) => OpenBrowser());
            contextMenu.MenuItems.Add("-");
            contextMenu.MenuItems.Add("Quit Appraisal Tracker", (s, e) => ExitApp());
            trayIcon.ContextMenu = contextMenu;

            trayIcon.DoubleClick += (s, e) => OpenBrowser();

            // 3. Stop any orphaned next.js processes on port 3000
            bool isRunning = IsServerRunning();
            if (isRunning)
            {
                Log("Server is currently running on port 3000. Killing orphaned processes to guarantee a fresh start...");
                KillOrphanedServers();
            }

            StartServer();

            // 4. Wait for server to be responsive
            WaitForServer();

            // 5. Open browser
            OpenBrowser();
        }

        private bool IsServerRunning()
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(appUrl);
                request.Timeout = 1000;
                using (var response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch (Exception ex)
            {
                // Silent catch for normal port testing
                return false;
            }
        }

        private void StartServer()
        {
            try
            {
                Log("Starting Next.js server via cmd...");
                serverProcess = new Process();
                serverProcess.StartInfo.FileName = "cmd.exe";
                // Redirect standard output and error to server_log.txt in the project directory
                string logDest = Path.Combine(projectDir, "server_log.txt");
                serverProcess.StartInfo.Arguments = "/c npm run dev > \"" + logDest + "\" 2>&1";
                serverProcess.StartInfo.WorkingDirectory = projectDir;
                serverProcess.StartInfo.CreateNoWindow = true;
                serverProcess.StartInfo.UseShellExecute = false;
                serverProcess.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                serverProcess.Start();
                Log("Server process spawned. PID: " + serverProcess.Id);
            }
            catch (Exception ex)
            {
                Log("ERROR spawning server process: " + ex.ToString());
            }
        }
        private void KillOrphanedServers()
        {
            try
            {
                var process = new Process();
                process.StartInfo.FileName = "cmd.exe";
                // Uses netstat to find process using port 3000 and kills it
                process.StartInfo.Arguments = "/c for /f \"tokens=5\" %a in ('netstat -aon ^| find \":3000\"') do taskkill /F /PID %a";
                process.StartInfo.CreateNoWindow = true;
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                process.Start();
                process.WaitForExit();
                Log("Cleared any orphaned processes on port 3000.");
                // Wait a moment for port to fully free up
                Thread.Sleep(1000);
            }
            catch (Exception ex)
            {
                Log("Failed to clear port 3000: " + ex.Message);
            }
        }

        private void WaitForServer()
        {
            Log("Waiting for server to respond on " + appUrl + "...");
            int attempts = 0;
            while (!IsServerRunning() && attempts < 30)
            {
                Thread.Sleep(500);
                attempts++;
            }
            Log("Server wait loop completed. Attempts: " + attempts + ". Server running: " + IsServerRunning());
        }

        private void OpenBrowser()
        {
            try
            {
                Log("Opening Edge in App Mode...");
                Process.Start("msedge.exe", "--app=" + appUrl);
            }
            catch (Exception ex)
            {
                Log("Failed to open Edge App Mode: " + ex.Message + ". Attempting default process start...");
                try
                {
                    Process.Start(appUrl);
                }
                catch (Exception ex2)
                {
                    Log("CRITICAL: Failed to open browser entirely: " + ex2.Message);
                }
            }
        }

        private void Log(string msg)
        {
            try
            {
                string logPath = Path.Combine(projectDir, "launcher_log.txt");
                File.AppendAllText(logPath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - " + msg + "\r\n");
            }
            catch {}
        }

        private void ExitApp()
        {
            Log("Exiting Appraisal Tracker...");
            trayIcon.Visible = false;

            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    Log("Killing Next.js process tree...");
                    var killProcess = new Process();
                    killProcess.StartInfo.FileName = "taskkill";
                    killProcess.StartInfo.Arguments = "/pid " + serverProcess.Id + " /t /f";
                    killProcess.StartInfo.CreateNoWindow = true;
                    killProcess.StartInfo.UseShellExecute = false;
                    killProcess.Start();
                    killProcess.WaitForExit();
                    Log("Kill process tree completed.");
                }
                catch (Exception ex)
                {
                    Log("Failed to kill Next.js server: " + ex.Message);
                }
            }

            if (mutex != null)
            {
                mutex.ReleaseMutex();
                mutex.Close();
            }

            Log("AppContext Exit complete.");
            Application.Exit();
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new AppContext());
        }
    }
}
