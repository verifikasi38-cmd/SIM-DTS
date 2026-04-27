import React, { forwardRef } from 'react';
import { CitizenData } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

export default forwardRef(function PDFCard({ citizen }: { citizen: CitizenData }, ref: React.Ref<HTMLDivElement>) {
  const createdAtString = typeof citizen.createdAt === 'string' ? citizen.createdAt : '2024-01-01T00:00:00Z';
  const citizenId = `TS-${createdAtString.substring(0, 4)}-${citizen.nik.substring(0, 6)}`;
  
  return (
    <div ref={ref} style={{ width: '600px', height: '400px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '24px', fontFamily: 'sans-serif', position: 'absolute', top: -9999, left: -9999 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #1e3a8a', paddingBottom: '16px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#e2e8f0' }}>
           <img src="https://cdn.phototourl.com/free/2026-04-26-e061c39c-4482-4062-9346-6450b90a83a7.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>KARTU WARGA</h1>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>DESA TAREMPA SELATAN</h2>
            <p style={{ fontSize: '10px', color: '#475569', margin: 0 }}>KECAMATAN SIANTAN - KABUPATEN KEPULAUAN ANAMBAS</p>
        </div>
      </div>
      
      {/* Body */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ width: '128px', height: '160px', backgroundColor: '#cbd5e1', border: '2px solid #1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Foto</div>
        
        <div style={{ flex: 1, fontSize: '11px', display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 8px' }}>
            <span style={{ fontWeight: 'bold' }}>NIK</span> <span>: {citizen.nik}</span>
            <span style={{ fontWeight: 'bold' }}>Nama</span> <span>: {citizen.name}</span>
            <span style={{ fontWeight: 'bold' }}>Tempat, Tgl Lahir</span> <span>: {citizen.birthPlace}, {citizen.birthDate}</span>
            <span style={{ fontWeight: 'bold' }}>Jenis Kelamin</span> <span>: {citizen.gender}</span>
            <span style={{ fontWeight: 'bold' }}>Alamat</span> <span>: {citizen.address}</span>
            <span style={{ fontWeight: 'bold' }}>Pekerjaan</span> <span>: {citizen.occupation}</span>
            <span style={{ fontWeight: 'bold' }}>Berlaku Sejak</span> <span>: {createdAtString.substring(0, 10)}</span>
        </div>
        
        <div style={{ width: '128px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QRCodeCanvas value={citizenId} size={90} />
            <div style={{ backgroundColor: '#1e3a8a', color: '#ffffff', width: '100%', textAlign: 'center', fontSize: '10px', fontWeight: 'bold', marginTop: '8px', padding: '4px', borderRadius: '2px' }}>
                ID WARGA<br/>{citizenId}
            </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        <div style={{ fontSize: '9px', color: '#1e3a8a', width: '50%' }}>
            SIM-DTS | Sistem Informasi Manajemen Data Desa Tarempa Selatan
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px', width: '33%' }}>
            <p>KEPALA DESA TAREMPA SELATAN</p>
            <div style={{ height: '48px', borderBottom: '2px dashed #94a3b8', margin: '4px 0' }}></div>
            <p style={{ fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #0f172a', width: 'fit-content', margin: '0 auto', padding: '0 8px' }}>ARIFAN</p>
        </div>
      </div>
    </div>
  );
});
