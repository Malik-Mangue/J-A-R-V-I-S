import { getContainer } from '../../src/application/container.js';
import ConvertIdeaForm from '../../components/ideas/ConvertIdeaForm.js';

export const metadata = { title: 'Ideias · Personal Second Brain' };
export const dynamic = 'force-dynamic';

/**
 * Ideas are their own entity and stay ideas until the user explicitly converts
 * them (docs/ARCHITECTURE.md #19, rule 3).
 */
export default async function IdeasPage() {
  const container = await getContainer();
  const ideas = await container.repositories.ideas.listByUser(container.userId);
  const convertible = ideas.filter((idea) => idea.status !== 'CONVERTED_TO_TASK' && idea.status !== 'CONVERTED_TO_PROJECT');

  return (
    <>
      <section className="card">
        <h2>Ideias ({ideas.length})</h2>
        {ideas.length === 0 ? (
          <p className="empty">Sem ideias registadas. Uma ideia nunca vira tarefa sem decisão tua.</p>
        ) : (
          ideas.map((idea) => (
            <div key={idea.id} className="item">
              <div className="item-title">
                <div>{idea.title}</div>
                <div className="item-meta">
                  {idea.status}
                  {idea.description ? ` · ${idea.description}` : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {convertible.length > 0 && (
        <section className="card">
          <h2>Converter ideia</h2>
          <p className="item-meta">
            A conversão é sempre explícita. Para uma tarefa é preciso indicar quando — se não souberes, escreve “mais
            tarde”.
          </p>
          {convertible.map((idea) => (
            <ConvertIdeaForm key={idea.id} idea={idea} />
          ))}
        </section>
      )}
    </>
  );
}