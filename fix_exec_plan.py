with open('src/components/ExecutionPlanView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if "ReportIssueModal" not in content:
    content = content.replace("import { TaskExecutionModal } from './TaskExecutionModal'", "import { TaskExecutionModal } from './TaskExecutionModal'\nimport { ReportIssueModal } from './ReportIssueModal'")

# Add state
if "const [reportTask, setReportTask] = useState<Task | null>(null)" not in content:
    content = content.replace("const [selectedTask, setSelectedTask] = useState<Task | null>(null)", "const [selectedTask, setSelectedTask] = useState<Task | null>(null)\n  const [reportTask, setReportTask] = useState<Task | null>(null)")

# Add button
button_html = """                                  </button>

                                  <button
                                    type="button"
                                    className="btn-task-runner state-pending"
                                    onClick={() => setReportTask(task)}
                                    title="Report an issue with this task"
                                  >
                                    <span>Report Issue</span>
                                  </button>"""
content = content.replace("                                  </button>", button_html, 1)

# Add Modal
modal_html = """      {/* Report Issue Modal */}
      {reportTask && (
        <ReportIssueModal
          isOpen={Boolean(reportTask)}
          onClose={() => setReportTask(null)}
          task={reportTask}
          project={project}
          refresh={refresh}
        />
      )}"""

if "{reportTask && (" not in content:
    content = content.replace("{/* Task Execution Runner Modal */}", modal_html + "\n\n      {/* Task Execution Runner Modal */}")

with open('src/components/ExecutionPlanView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
