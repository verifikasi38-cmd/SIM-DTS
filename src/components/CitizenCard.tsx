import React, { useRef } from 'react';
import { CitizenData } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import PDFCard from './PDFCard';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CitizenCard({ citizen }: { citizen: CitizenData }) {
  // Generate a mock ID
  const createdAtString = typeof citizen.createdAt === 'string' ? citizen.createdAt : '2024-01-01T00:00:00Z';
  const citizenId = `TS-${createdAtString.substring(0, 4)}-${citizen.nik.substring(0, 6)}`;
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a5');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Kartu_Warga_${citizen.name}.pdf`);
  };
  
  return (
    <>
      <div className="no-print w-[510px] h-[320px] bg-white rounded-[20px] shadow-2xl border border-slate-300 overflow-hidden relative font-sans p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Kartu Warga</h2>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <span>Download PDF</span>
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
          <div className="flex gap-6">
            <div className="w-24 h-32 bg-slate-200 rounded-lg flex items-center justify-center">Foto</div>
            <div className="flex-1 space-y-1 text-sm">
              <p><strong>Nama:</strong> {citizen.name}</p>
              <p><strong>NIK:</strong> {citizen.nik}</p>
              <p><strong>Alamat:</strong> {citizen.address}</p>
            </div>
          </div>
        </div>
      </div>
      <PDFCard citizen={citizen} ref={cardRef} />
    </>
  );
}
