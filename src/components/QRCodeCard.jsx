import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { copyToClipboard } from '../lib/clipboard';
import { safeViewTransition, attachSpotlight } from '../lib/transitions';
import {
  IconSearch,
  IconCopy,
  IconDownload,
  IconImage,
  IconCheckCircle,
} from './common/CustomIcons';

export default function QRCodeCard({ ticketCode, fullName }) {
  const [showModal, setShowModal] = useState(false);
  const [copyToast, setCopyToast] = useState(null);
  const [copiedText, setCopiedText] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (showModal && modalRef.current) {
      return attachSpotlight(modalRef.current);
    }
  }, [showModal]);

  const openModal = () => {
    safeViewTransition(() => {
      setShowModal(true);
    });
  };

  const closeModal = () => {
    safeViewTransition(() => {
      setShowModal(false);
    });
  };

  const downloadQR = useCallback(() => {
    const canvas = document.getElementById(`qr-modal-canvas-${ticketCode}`);
    if (!canvas) {
      openModal();
      return;
    }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${ticketCode}.png`;
    a.click();
  }, [ticketCode]);

  const handleCopyTicketCode = useCallback(async () => {
    const success = await copyToClipboard(ticketCode);
    if (success) {
      setCopiedText(true);
      setCopyToast(`Đã sao chép mã vé: ${ticketCode}`);
      setTimeout(() => {
        setCopiedText(false);
        setCopyToast(null);
      }, 2500);
    } else {
      alert('Không thể sao chép mã vé.');
    }
  }, [ticketCode]);

  const copyQRImage = useCallback(() => {
    const canvas = document.getElementById(`qr-modal-canvas-${ticketCode}`);
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopyToast('Đã sao chép ảnh QR!');
          setTimeout(() => setCopyToast(null), 3000);
        } catch (err) {
          alert('Lỗi sao chép ảnh: Trình duyệt không cho phép ghi bộ nhớ tạm. Bạn có thể sử dụng nút "Copy Mã Vé" thay thế.');
        }
      } else {
        alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Bạn có thể sử dụng nút "Copy Mã Vé" thay thế.');
      }
    }, 'image/png');
  }, [ticketCode]);

  return (
    <>
      {/* Action buttons in table row — lightweight without hidden canvas */}
      <div className="qr-cell">
        <button
          id={`btn-view-qr-${ticketCode}`}
          className="btn btn-secondary btn-sm"
          onClick={openModal}
          title="Xem mã QR"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <IconSearch size={13} /> Xem QR
        </button>
        <button
          id={`btn-copy-code-${ticketCode}`}
          className="btn btn-secondary btn-sm"
          onClick={handleCopyTicketCode}
          title={`Sao chép mã vé: ${ticketCode}`}
        >
          {copiedText ? <IconCheckCircle size={13} color="var(--accent-success)" /> : <IconCopy size={13} />}
        </button>
        <button
          id={`btn-download-qr-${ticketCode}`}
          className="btn btn-secondary btn-sm"
          onClick={downloadQR}
          title="Tải mã QR"
        >
          <IconDownload size={13} />
        </button>
      </div>

      {/* Modal — renders QRCodeCanvas on-demand via React Portal to document.body */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`modal-title-${ticketCode}`}
        >
          <div
            ref={modalRef}
            className="modal-content spotlight-card liquid-glass"
            onClick={e => e.stopPropagation()}
          >
            <p className="modal-name" id={`modal-title-${ticketCode}`}>{fullName}</p>
            <div className="modal-ticket">
              <span
                className="ticket-code"
                onClick={handleCopyTicketCode}
                style={{ cursor: 'pointer' }}
                title="Click để sao chép mã vé"
              >
                {ticketCode}
              </span>
            </div>
            <div className="modal-qr-wrapper" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <QRCodeCanvas
                id={`qr-modal-canvas-${ticketCode}`}
                value={ticketCode}
                size={240}
                level="H"
                includeMargin={true}
              />
            </div>
            {copyToast && (
              <div style={{ color: 'var(--accent-success)', fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <IconCheckCircle size={15} color="var(--accent-success)" /> {copyToast}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                id={`btn-modal-copy-code-${ticketCode}`}
                className="btn btn-primary"
                onClick={handleCopyTicketCode}
                title="Sao chép mã vé"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconCopy size={15} /> Copy Mã Vé
              </button>
              <button
                id={`btn-modal-copy-${ticketCode}`}
                className="btn btn-secondary"
                onClick={copyQRImage}
                title="Sao chép trực tiếp hình ảnh QR để Dán (Ctrl+V / Cmd+V)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconImage size={15} /> Copy Ảnh QR
              </button>
              <button
                id={`btn-modal-download-${ticketCode}`}
                className="btn btn-secondary"
                onClick={downloadQR}
                title="Tải mã QR"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconDownload size={15} /> Tải PNG
              </button>
              <button
                id={`btn-modal-close-${ticketCode}`}
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
