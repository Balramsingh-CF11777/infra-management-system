import { Link } from "react-router-dom";
import leadCreateArt from "@/assets/design/lead-create-empty.png";

export function LeadEmptyState() {
  return (
    <div className="ims-card flex flex-col items-center px-6 py-12 text-center lg:py-16">
      <img
        src={leadCreateArt}
        alt=""
        className="mb-6 h-auto w-full max-w-[280px] object-contain sm:max-w-[320px]"
      />
      <p className="text-base font-semibold text-ims-ink sm:text-[17px]">Create your first Property Lead</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        Start by capturing a potential property near your target location.
      </p>
      <Link to="/chola360/leads/new" className="ims-btn-primary mt-6 inline-flex no-underline">
        Create Lead
      </Link>
    </div>
  );
}
