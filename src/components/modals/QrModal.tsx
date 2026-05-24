import React from 'react';
import { Smartphone, X } from 'lucide-react';
import { NetworkIp } from '../../types';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemIps: NetworkIp[];
  activeIp: string;
  setActiveIp: (ip: string) => void;
  qrCodeDataUrl: string;
}

export default function QrModal({
  isOpen,
  onClose,
  systemIps,
  activeIp,
  setActiveIp,
  qrCodeDataUrl
}: QrModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-[350px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            Mobile Connection Link
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-md hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex flex-col gap-3 p-5">
          <p className="text-sm text-zinc-400">
            To view this tracker on your phone while in the field:
          </p>
          <ol className="list-decimal pl-4 flex flex-col gap-1 text-xs text-zinc-400">
            <li>Ensure both this PC and your phone are connected to your <strong className="text-zinc-200">Tailscale VPN</strong> network.</li>
            <li>Scan the QR code below using your phone&apos;s camera, or visit the link.</li>
          </ol>

          {systemIps.length > 0 ? (
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Select Connection IP</label>
                <select 
                  value={activeIp} 
                  onChange={(e) => setActiveIp(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {systemIps.map(ip => (
                    <option key={ip.address} value={ip.address}>
                      {ip.address} ({ip.name}) {ip.isTailscale ? '★ Tailscale' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Browser Link</span>
                <span className="text-sm font-mono text-blue-400 select-all">{`http://${activeIp}:3000`}</span>
              </div>

              {qrCodeDataUrl && (
                <div className="mt-2 bg-white p-3 rounded-xl mx-auto border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="Mobile link QR code" className="w-48 h-48" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-400 text-sm mt-2 font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              No local network interfaces detected. Make sure Tailscale is connected.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center p-4 border-t border-zinc-800 bg-zinc-900/50">
          <button onClick={onClose} className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-all">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
