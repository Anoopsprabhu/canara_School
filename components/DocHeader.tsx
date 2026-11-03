/* eslint-disable @next/next/no-img-element */

// Letterhead used on the printed application form and receipt.
export default function DocHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4 border-b-2 border-brand-800 pb-2">
      <img src="/logo.jpg" alt="" className={compact ? "h-16 w-auto" : "h-24 w-auto"} />
      <div className="flex-1 text-center">
        <div
          className={`font-display font-bold tracking-wide text-brand-800 uppercase ${compact ? "text-[21px]" : "text-[24px]"}`}
          style={{ lineHeight: 1.1 }}
        >
          Canara High School Old Boys&apos; Association (R.)
        </div>
        <div className="mt-1 text-[13px] text-brand-900">A.S.R.P. Road, Dongerkery, Kodialbail, Mangaluru – 575 003</div>
        <div className="text-[12.5px] text-brand-900">Ph: 8296421577 &nbsp;|&nbsp; Email: canaraoldboys@gmail.com</div>
      </div>
      <div className={compact ? "w-6" : "w-10"} />
    </div>
  );
}
