import sys

file_path = 'c:/Users/alfat/saas-project-manager/project-manager-frontend/src/pages/BoardPage.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add showStatusMenu state (if not already there)
# 2. Reorder resolvedAssignees and subtaskAssigneeOptions

# Let's find the indices of the blocks
start_line = -1
subtask_assignee_options_start = -1
subtask_assignee_options_end = -1
resolved_assignees_start = -1
resolved_assignees_end = -1
attachments_start = -1
attachments_end = -1

for i, line in enumerate(lines):
    if 'function TaskDetailPanel({' in line:
        start_line = i
    if 'const subtaskAssigneeOptions =' in line:
        subtask_assignee_options_start = i
    if subtask_assignee_options_start != -1 and subtask_assignee_options_end == -1:
        if ': members' in line:
            subtask_assignee_options_end = i + 1
    if 'const resolvedAssignees = (task.assignees || [])' in line:
        resolved_assignees_start = i
    if resolved_assignees_start != -1 and resolved_assignees_end == -1:
        if '.filter(Boolean)' in line:
            resolved_assignees_end = i + 1
    if 'const [attachments, setAttachments] = useState(task.attachments || [])' in line:
        attachments_start = i
    if attachments_start != -1 and attachments_end == -1:
        if 'const fileInputRef = useRef(null)' in line:
            attachments_end = i + 1

# Extract the blocks
resolved_assignees_block = lines[resolved_assignees_start:resolved_assignees_end]
subtask_assignee_options_block = lines[subtask_assignee_options_start:subtask_assignee_options_end]
attachments_block = lines[attachments_start:attachments_end]

# Remove the blocks from their original positions (bottom to top to avoid index shifts)
# Wait, just reconstruct the whole function part. 
# Better: Replace the whole block from 603 to 810 with a freshly constructed one.

new_inner_lines = []

# Find end of state declarations
state_end = -1
for i in range(start_line, len(lines)):
  if 'const [subtaskError, setSubtaskError] = useState(\'\')' in lines[i]:
    state_end = i + 1
    break

# Reconstruct
new_file_lines = lines[:state_end]
new_file_lines.append('\n')
new_file_lines.extend(attachments_block)
new_file_lines.append('\n')
new_file_lines.append('  // 2. resolvedAssignees MUST come before subtaskAssigneeOptions\n')
new_file_lines.extend(resolved_assignees_block)
new_file_lines.append('\n')
new_file_lines.append('  // 3. NOW subtaskAssigneeOptions can safely use it\n')
new_file_lines.extend(subtask_assignee_options_block)

# Add the rest of the file after the original positions of these blocks
# This is tricky. Let's just use a simpler replacement for now.
# Actually, I'll use the indices I found.

# I will just write a new file content and overwrite.
# But the file is 4k lines. I should be careful.

# Let's try to just do the specific move.
# Move resolved_assignees_block to before subtask_assignee_options_start
# And remove them from their old places.

indices_to_remove = list(range(resolved_assignees_start, resolved_assignees_end)) + \
                    list(range(subtask_assignee_options_start, subtask_assignee_options_end)) + \
                    list(range(attachments_start, attachments_end))

new_lines = []
for i, line in enumerate(lines):
    if i == state_end:
        new_lines.extend(attachments_block)
        new_lines.append('\n')
        new_lines.append('  // 2. resolvedAssignees MUST come before subtaskAssigneeOptions\n')
        new_lines.extend(resolved_assignees_block)
        new_lines.append('\n')
        new_lines.append('  // 3. NOW subtaskAssigneeOptions can safely use it\n')
        new_lines.extend(subtask_assignee_options_block)
        new_lines.append('\n')
    
    if i not in indices_to_remove:
        new_lines.append(line)

# Also adding showStatusMenu state
for i, line in enumerate(new_lines):
    if 'const [showPriorityMenu, setShowPriorityMenu] =' in line:
        new_lines.insert(i + 2, "  const [showStatusMenu, setShowStatusMenu] = useState(false)\n")
        break

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully reordered BoardPage.jsx TaskDetailPanel declarations.")
