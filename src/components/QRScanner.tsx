import { Scanner } from '@yudiel/react-qr-scanner';
import QrScanner from 'qr-scanner';
import { ImageUp, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadError('');
      const result = await QrScanner.scanImage(file);
      onScan(result);
    } catch {
      setUploadError('The QR code could not be read from that image.');
    }
  };

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#dde0da] bg-[#18202a] p-3">
      <div className="relative aspect-square overflow-hidden rounded-[1.15rem] bg-black">
        <Scanner
          onScan={(results) => {
            if (results[0]?.rawValue) onScan(results[0].rawValue);
          }}
          components={{ onOff: true, torch: true }}
          styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
        />
        <div className="pointer-events-none absolute inset-5 rounded-[1rem] border-2 border-[#ff8b5c] shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#ff8b5c] shadow-[0_0_14px_2px_rgba(255,139,92,0.9)]" />
        <button onClick={onClose} aria-label="Stop scanner" className="absolute right-3 top-3 rounded-xl bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/70"><X size={18} /></button>
        <label className="absolute bottom-3 right-3 cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#18202a] shadow-lg transition hover:bg-[#fff3ef]"><input ref={fileInputRef} onChange={(event) => void handleFileUpload(event)} accept="image/*" className="hidden" type="file" /><span className="flex items-center gap-1.5"><ImageUp size={15} /> Upload QR</span></label>
      </div>
      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-4"><p className="text-sm text-slate-300">Point the camera at the participant’s badge.</p><span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#ffb29a]"><span className="size-2 rounded-full bg-[#ff8b5c]" /> Ready</span></div>
      {uploadError && <p className="px-2 pt-2 text-xs text-red-300">{uploadError}</p>}
    </div>
  );
};

export default QRScanner;
