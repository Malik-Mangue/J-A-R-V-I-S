import CapturePanel from '../../components/capture/CapturePanel.js';
import { getContainer } from '../../src/application/container.js';

/**
 * Capture screen (docs/ARCHITECTURE.md #39).
 *
 * A single screen for voice and text, with preview/confirm/cancel.
 * When reached with ?proposal=<id>, it reopens that pending proposal for review.
 */
export const metadata = { title: 'Capturar · Personal Second Brain' };
export const dynamic = 'force-dynamic';

export default async function CapturePage({ searchParams }) {
  const proposalId = searchParams?.proposal;
  let pendingProposal = null;

  if (proposalId) {
    const container = await getContainer();
    const proposal = await container.repositories.proposals.findById(String(proposalId));
    if (proposal && proposal.status === 'PENDING') {
      pendingProposal = {
        status: 'PROPOSAL',
        proposalId: proposal.id,
        intent: proposal.intent,
        preview: proposal.payload,
        warnings: proposal.warnings,
      };
    }
  }

  return (
    <>
      <CapturePanel initialAnalysis={pendingProposal} />
      <p className="item-meta">
        O áudio original não é guardado. Fica apenas a transcrição e a origem da informação.
      </p>
    </>
  );
}