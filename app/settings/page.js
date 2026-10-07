import { getContainer } from '../../src/application/container.js';
import { getAutomationSettings } from '../../src/application/settings/automation.js';
import AutomationForm from '../../components/settings/AutomationForm.js';
import { AUTOMATION_CATEGORIES } from '../../src/domain/shared/constants.js';

export const metadata = { title: 'Definições · Personal Second Brain' };
export const dynamic = 'force-dynamic';

/**
 * Automation is OFF by default and always user-controlled
 * (docs/README.md #15, docs/ARCHITECTURE.md #23).
 */
export default async function SettingsPage() {
  const container = await getContainer();
  const settings = await getAutomationSettings(container);

  return (
    <>
      <section className="card">
        <h2>Automação</h2>
        <p className="item-meta">
          Por omissão tudo está desligado: nada é criado sem a tua confirmação. Mesmo com a categoria activa, as regras
          de negócio continuam a aplicar-se — informação em falta implica sempre perguntar.
        </p>
        <AutomationForm settings={settings} categories={AUTOMATION_CATEGORIES} />
      </section>

      <section className="card">
        <h2>Utilizador</h2>
        <table className="preview-table">
          <tbody>
            <tr>
              <th scope="row">Identificador</th>
              <td>{container.userId}</td>
            </tr>
            <tr>
              <th scope="row">Fuso horário</th>
              <td>{container.timezone}</td>
            </tr>
            <tr>
              <th scope="row">Moeda por omissão</th>
              <td>{container.defaultCurrency ?? 'não definida (o sistema pergunta)'}</td>
            </tr>
            <tr>
              <th scope="row">Fornecedor de IA</th>
              <td>{container.ai.providerName}</td>
            </tr>
            <tr>
              <th scope="row">Transcrição</th>
              <td>{container.transcription.providerName}</td>
            </tr>
            <tr>
              <th scope="row">Base de dados</th>
              <td>{container.db.kind}</td>
            </tr>
          </tbody>
        </table>
        <p className="item-meta">
          A moeda por omissão vem de <code>DEFAULT_CURRENCY</code>. Se não estiver definida, o sistema pergunta em vez
          de assumir.
        </p>
      </section>
    </>
  );
}