import { SiteImageThumb } from "@/components/common/SiteImageThumb";
import { siteImagesFromLead } from "@/features/leads/siteImageSlots";

/** Every captured site photo for a lead. Used on Property Verification. */
export function SitePhotoGallery({ lead }: { lead: Record<string, unknown> }) {
  const images = siteImagesFromLead(lead);
  return (
    <section className="overflow-hidden rounded-2xl border border-ims-line bg-white shadow-[0_4px_14px_rgba(31,37,71,0.04)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="text-[14px] font-semibold text-ims-ink">Site Photos</h2>
        <span className="text-[12px] font-medium text-slate-500">{images.length}</span>
      </div>
      {images.length ? (
        <div className="grid grid-cols-3 gap-2 border-t border-ims-line px-4 py-4 sm:grid-cols-4">
          {images.map((row) => (
            <div key={row.slot} className="min-w-0" title={row.slot}>
              <div className="aspect-square overflow-hidden rounded-xl border border-ims-line bg-slate-50">
                <SiteImageThumb storedUrl={row.url} alt={row.slot} className="h-full w-full object-cover" />
              </div>
              <p className="mt-1 truncate text-center text-[11px] font-medium text-slate-600">{row.slot}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="border-t border-ims-line px-4 py-3 text-[12px] text-slate-500">No site photos captured yet.</p>
      )}
    </section>
  );
}
