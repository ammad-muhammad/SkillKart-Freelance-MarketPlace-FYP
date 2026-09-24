import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { openExternal } from '../../../utils/externalLink';
import './OrderRequirements.css';

/**
 * Collapsible view of a gig order's requirements (Job.requirements) — what
 * the client said they need when ordering. Shown to the freelancer in My
 * Work and to the client in My Projects. Orders placed before requirements
 * existed just say so instead of rendering nothing.
 *
 * `title` differs per audience ("Client requirements" vs "Your requirements").
 * `scope` — for a custom-offer order, the offer's own description (the
 * agreed scope), shown above the client's optional extra notes.
 */
export default function OrderRequirements({ requirements, title = 'Client requirements', defaultOpen = false, emptyText, scope }) {
  const [open, setOpen] = useState(defaultOpen);
  const description = requirements?.description?.trim();
  const links = Array.isArray(requirements?.referenceLinks) ? requirements.referenceLinks : [];
  const hasContent = !!description || links.length > 0;

  return (
    <div className="ord-req">
      <button
        type="button"
        className="ord-req__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ClipboardList size={14} />
        <span>{title}</span>
        {!hasContent && !scope && <span className="ord-req__none">— none provided</span>}
        {open ? <ChevronUp size={14} className="ord-req__chev" /> : <ChevronDown size={14} className="ord-req__chev" />}
      </button>

      {open && (
        <div className="ord-req__body">
          {scope && (
            <>
              <span className="ord-req__sub">Agreed scope (custom offer)</span>
              <p className="ord-req__text">{scope}</p>
              <span className="ord-req__sub">Client's extra notes</span>
            </>
          )}
          {hasContent ? (
            <>
              {description && <p className="ord-req__text">{description}</p>}
              {links.length > 0 && (
                <ul className="ord-req__links">
                  {links.map((l) => (
                    <li key={l}>
                      <Link2 size={12} />
                      <a href={l} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); openExternal(l); }}>{l}</a>
                    </li>
                  ))}
                </ul>
              )}
              {requirements?.submittedAt && (
                <span className="ord-req__date">Submitted {new Date(requirements.submittedAt).toLocaleString()}</span>
              )}
            </>
          ) : (
            <p className="ord-req__text ord-req__text--muted">
              {emptyText || 'No requirements were provided with this order — use chat to agree on the details.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
