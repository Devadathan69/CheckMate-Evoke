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
    <div className="mx-auto max-w-md overflow-hidden border border-[#8238b3] bg-[#17012e] p-3 shadow-[6px_6px_0_rgba(0,0,0,0.25)]">
      <div className="relative aspect-square overflow-hidden border border-white/10 bg-black">
        <Scanner
          onScan={(results) => {
            if (results[0]?.rawValue) onScan(results[0].rawValue);
          }}
          components={{ onOff: true, torch: true }}
          styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
        />
        <div className="pointer-events-none absolute inset-5 border-2 border-[#55d6c2] shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#f1d46c] shadow-[0_0_14px_2px_rgba(241,212,108,0.9)]" />
        <button onClick={onClose} aria-label="Stop scanner" className="absolute right-3 top-3 border border-white/20 bg-black/45 p-2 text-white backdrop-blur transition hover:border-[#55d6c2] hover:bg-black/70"><X size={18} /></button>
        <label className="absolute bottom-3 right-3 cursor-pointer border border-[#f1d46c] bg-[#cca943] px-3 py-2 text-xs font-semibold text-[#17012e] shadow-lg transition hover:bg-[#f1d46c]"><input ref={fileInputRef} onChange={(event) => void handleFileUpload(event)} accept="image/*" className="hidden" type="file" /><span className="flex items-center gap-1.5"><ImageUp size={15} /> Upload QR</span></label>
      </div>
      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-4"><p className="text-sm text-[#d8cae6]">Point the camera at the participant’s badge.</p><span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#55d6c2]"><span className="size-2 bg-[#55d6c2]" /> Ready</span></div>
      {uploadError && <p className="px-2 pt-2 text-xs text-red-300">{uploadError}</p>}
    </div>
  );
};

export default QRScanner;
