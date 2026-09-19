import sys
import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = "function Testing({ project, refresh }: { project: Project; refresh: () => void }) { return <><PageHeader eyebrow=\"VALIDATION\" title=\"Verification & Testing\" text=\"Measurable scenarios that prove the system behaves safely.\" action={<Button icon={Sparkles}>Generate Test Cases</Button>} /><div className=\"metrics-strip\"><span><b>{project.tests.length}</b> Total Tests</span><span><b>{project.tests.filter(t => t.status === 'Passed').length}</b> Passed</span><span><b>{project.tests.filter(t => t.status === 'Pending').length}</b> Pending</span><span><b>{project.tests.filter(t => t.status === 'Failed').length}</b> Failed</span></div><div className=\"panel table-panel test-table\"><div className=\"test-head\"><span>ID</span><span>SCENARIO</span><span>PRECONDITION</span><span>EXPECTED RESULT</span><span>STATUS</span></div>{project.tests.map(test => <div className=\"test-row\" key={test.id}><b>{test.id}</b><span>{test.scenario}</span><span>{test.precondition}</span><span>{test.expected}</span><select value={test.status} onChange={e => { projectService.updateTestCase(test.id, { status: e.target.value as any }, project.id); refresh() }}><option>Pending</option><option>Passed</option><option>Failed</option></select></div>)}</div></> }"

replacement = '''
function Testing({ project, refresh }: { project: Project; refresh: () => void }) {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const generate = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await agentService.generateTests(project);
      const current = projectService.getProject(project.id)!;
      projectService.saveProject({
        ...current,
        tests: result.tests,
        activity: [
          {
            id: -\,
            agent: 'Test Agent',
            action: 'Generate Verification Strategy',
            status: 'Completed',
            duration: \ms,
            createdAt: 'Just now',
            provider: result.analysis.provider,
            model: result.analysis.model,
            summary: \ test cases generated
          },
          ...current.activity
        ]
      });
      setToast('Verification strategy generated successfully.');
      refresh();
    } catch (e: any) {
      setError(e.message || 'Error running Test Agent');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="VALIDATION" title="Verification & Testing" text="Measurable scenarios that prove the system behaves safely." action={<Button onClick={generate} icon={running ? RefreshCw : Sparkles}>{running ? 'Generating...' : 'Generate Test Cases'}</Button>} />
      
      {running && <AgentProgress realProvider title="Test Agent is generating your verification strategy..." steps={['Loading project engineering context...', 'Generating verification strategy...', 'Validating structured response...', 'Saving test artifacts...']} />}
      
      {error && <div className="agent-error panel"><strong>Test Agent could not complete the analysis.</strong><span>{error}</span><button className="btn btn-secondary" onClick={generate}>Retry</button></div>}

      {!running && (
        <>
          <div className="metrics-strip">
            <span><b>{project.tests.length}</b> Total Tests</span>
            <span><b>{project.tests.filter(t => t.status === 'Passed').length}</b> Passed</span>
            <span><b>{project.tests.filter(t => t.status === 'Pending').length}</b> Pending</span>
            <span><b>{project.tests.filter(t => t.status === 'Failed').length}</b> Failed</span>
          </div>
          <div className="panel table-panel test-table">
            <div className="test-head"><span>ID</span><span>SCENARIO</span><span>PRECONDITION</span><span>EXPECTED RESULT</span><span>STATUS</span></div>
            {project.tests.map(test => (
              <div className="test-row" key={test.id}>
                <b>{test.id}</b>
                <span>{test.scenario}</span>
                <span>{test.precondition}</span>
                <span>{test.expected}</span>
                <select value={test.status} onChange={e => { projectService.updateTestCase(test.id, { status: e.target.value as any }, project.id); refresh() }}>
                  <option>Pending</option>
                  <option>Passed</option>
                  <option>Failed</option>
                </select>
              </div>
            ))}
          </div>
        </>
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
'''

if target in content:
    content = content.replace(target, replacement.lstrip('\n'))
else:
    print("Could not find target in App.tsx!")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('App.tsx updated')

