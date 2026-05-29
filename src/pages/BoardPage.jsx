import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTheme } from '../context/ThemeContext'
import api from '../services/axios'
import { getPermissions } from '../utils/permissions'
import RichTextEditor from '../components/RichTextEditor'
import { motion, AnimatePresence } from 'framer-motion'
import { slideUp, slideRight, scaleIn, staggerContainer, taskCardVariant, EASE } from '../utils/animations'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { io } from 'socket.io-client'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'

const PRIORITY_CONFIG = {
  urgent: {
    icon: 'flag',
    color: '#ef4444',
    label: 'Urgent'
  },
  high: {
    icon: 'keyboard_arrow_up',
    color: '#f97316',
    label: 'High'
  },
  medium: {
    icon: 'remove',
    color: '#eab308',
    label: 'Medium'
  },
  low: {
    icon: 'keyboard_arrow_down',
    color: '#94a3b8',
    label: 'Low'
  },
}

const COLUMN_COLORS = {
  'To Do': '#94a3b8',
  'In Progress': '#6366f1',
  'Review': '#f59e0b',
  'Done': '#10b981',
}

const LABEL_COLORS = [
  { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa',
    bgLight: '#dbeafe', textLight: '#1d4ed8' },
  { bg: 'rgba(16,185,129,0.15)', text: '#34d399',
    bgLight: '#d1fae5', textLight: '#065f46' },
  { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa',
    bgLight: '#ede9fe', textLight: '#5b21b6' },
  { bg: 'rgba(239,68,68,0.15)', text: '#f87171',
    bgLight: '#fee2e2', textLight: '#991b1b' },
  { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24',
    bgLight: '#fef3c7', textLight: '#92400e' },
]

const getLabelColor = (label, isDark) => {
  const idx = label.charCodeAt(0) % LABEL_COLORS.length
  const c = LABEL_COLORS[idx]
  return isDark
    ? { bg: c.bg, text: c.text }
    : { bg: c.bgLight, text: c.textLight }
}

const getColumnColor = (name) =>
  COLUMN_COLORS[name] || '#6366f1'


const timeAgo = (date) => {
  const diff = Date.now() - new Date(date)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(date).toLocaleDateString('en-US',
    { month: 'short', day: 'numeric' })
}

function TaskCard({ task, isDark, onClick, onDelete, showConfirm, canDelete = true, canUpdate = true }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: task._id, disabled: !canUpdate })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const priority = PRIORITY_CONFIG[task.priority] ||
                   PRIORITY_CONFIG.medium
  const isOverdue = task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      data-is-dragging={isSortableDragging ? 'true' : 'false'}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isSortableDragging) onClick(task)
      }}
      className={`orbit-task-card group p-3 rounded-lg border
        ${canUpdate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} select-none
        ${isDark
          ? 'bg-[#1c1c1c] border-[rgba(255,255,255,0.08)]'
          : 'bg-white border-slate-200 shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className="material-symbols-outlined text-[16px]"
          style={{ color: priority.color }}
        >
          {priority.icon}
        </span>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(p => !p)
            }}
            className={`opacity-0 group-hover:opacity-100
              rounded p-0.5 transition-all
              ${isDark
                ? 'text-slate-600 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.06)]'
                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
              } ${showMenu ? 'opacity-100 bg-white/5' : ''}`}
          >
            <span className="material-symbols-outlined text-[16px]">
              more_horiz
            </span>
          </button>
          
          {showMenu && (
            <div 
              ref={menuRef}
              className={`absolute right-0 top-7 w-32
              rounded-xl shadow-xl z-20 overflow-hidden
              ${isDark
                ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                : 'bg-white border border-slate-200'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onClick(task)
                }}
                className={`w-full flex items-center gap-2
                           px-3 py-2 text-xs text-left
                           ${isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                Open
              </button>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    showConfirm({
                      title: 'Delete Task',
                      message: `Are you sure? ${task.title} will be gone forever.`,
                      confirmText: 'Delete',
                      confirmColor: 'red',
                      onConfirm: () => onDelete(task._id),
                      narrow: true
                    })
                  }}
                  className="w-full flex items-center gap-2
                             px-3 py-2 text-xs text-red-500
                             hover:bg-red-500/10 transition-colors
                             cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className={`text-sm font-medium leading-snug
        mb-2 line-clamp-2
        ${task.status === 'done'
          ? 'line-through opacity-60'
          : isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>
        {task.title}
      </p>

      {task.description && (
        <p style={{
          fontSize: '11px',
          color: isDark ? '#475569' : '#94a3b8',
          lineHeight: 1.4,
          margin: '4px 0 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {task.description.replace(/<[^>]*>/g, '')}
        </p>
      )}

      {task.subtasks?.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex', gap: '2px', height: '4px',
            borderRadius: '2px', overflow: 'hidden',
            marginBottom: '4px'
          }}>
            {task.subtasks.map((sub, idx) => (
              <div key={sub._id || idx} style={{
                flex: 1,
                background: sub.completed || sub.status === 'done'
                  ? '#10b981' : sub.status === 'in-progress'
                  ? '#6366f1' : isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'
              }} />
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
              {Math.round((task.subtasks.filter(s => s.completed || s.status === 'done').length / task.subtasks.length) * 100)}% Done
            </span>
            <span style={{ fontSize: '10px', color: isDark ? '#475569' : '#94a3b8', fontWeight: 600 }}>
              {task.subtasks.filter(s => s.completed || s.status === 'done').length}/{task.subtasks.length}
            </span>
          </div>
        </div>
      )}

      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label, i) => {
            const c = getLabelColor(label, isDark)
            return (
              <span
                key={i}
                style={{
                  backgroundColor: c.bg,
                  color: c.text
                }}
                className="text-[9px] font-bold uppercase
                           px-1.5 py-0.5 rounded-sm
                           tracking-wider"
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`flex items-center gap-0.5
              text-[10px]
              ${isOverdue
                ? 'text-red-500'
                : isDark ? 'text-slate-600' : 'text-slate-400'
              }`}>
              <span className="material-symbols-outlined
                               text-[12px]">
                schedule
              </span>
              {new Date(task.dueDate)
                .toLocaleDateString('en-US',
                  { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className={`flex items-center gap-0.5
              text-[10px]
              ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              <span className="material-symbols-outlined
                               text-[12px]">
                chat_bubble
              </span>
              {task.commentCount}
            </span>
          )}
        </div>

        {(() => {
          const resolvedAssignees = (task.assignees || [])
            .map(a => {
              if (a && typeof a === 'object' && a.name) return a
              return { _id: a, name: 'Member', avatar: null }
            })
          return resolvedAssignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {resolvedAssignees.slice(0, 3).map((a, idx) => (
                <div
                  key={String(a._id || idx)}
                  title={a.name || 'Member'}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: 'white',
                    background: '#6366f1',
                    border: '1.5px solid',
                    borderColor: isDark ? '#1c1c1c' : '#fff',
                    flexShrink: 0,
                  }}
                >
                  {a.avatar
                    ? <img
                        src={a.avatar}
                        alt={a.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    : (a.name || 'M').charAt(0).toUpperCase()
                  }
                </div>
            ))}
            {resolvedAssignees.length > 3 && (
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                fontWeight: 700,
                color: 'white',
                background: '#475569',
                border: '1.5px solid',
                borderColor: isDark ? '#1c1c1c' : '#fff',
              }}>
                +{resolvedAssignees.length - 3}
              </div>
            )}
          </div>
          )
        })()}
      </div>
    </div>
  )
}

function BoardColumn({
  column, tasks, isDark, width,
  onAddTask, onTaskClick, onDeleteColumn, onDeleteTask,
  showConfirm, canDeleteColumn = true, perms = getPermissions('viewer')
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column._id,
    data: { type: 'column', columnId: column._id },
  })
  const colColor = getColumnColor(column.name)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  return (
    <div className="board-column flex flex-col shrink-0 rounded-xl
             overflow-hidden"
      style={{
        width: width || '280px',
        minWidth: '200px',
        maxWidth: '380px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: isOver
          ? isDark
            ? 'rgba(99,102,241,0.08)'
            : 'rgba(99,102,241,0.05)'
          : 'transparent',
        borderRadius: '12px',
        border: isOver
          ? '2px solid rgba(99,102,241,0.3)'
          : '2px solid transparent',
        transition: 'all 150ms ease',
        minHeight: '100px',
        padding: '4px',
      }}>
      {/* Column header */}
      <div className={`px-3 py-2.5 flex items-center
        gap-2
        ${isDark
          ? 'bg-[rgba(255,255,255,0.04)]'
          : 'bg-slate-200/60'
        }`}>
        <div
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: colColor }}
        />
        <span className={`text-[10px] font-semibold
          uppercase tracking-widest
          ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {column.name}
        </span>
        <div className={`size-[18px] rounded flex items-center
          justify-center text-[10px] font-bold
          ${isDark
            ? 'bg-[rgba(255,255,255,0.08)] text-slate-400'
            : 'bg-slate-300/60 text-slate-600'
          }`}>
          {tasks.length}
        </div>
        <div className="flex-1" />
        {canDeleteColumn && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(p => !p)}
              className={`p-0.5 rounded transition-colors
                ${isDark
                  ? 'text-slate-600 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-300/40'
                }`}
            >
              <span className="material-symbols-outlined
                               text-[18px]">
                more_horiz
              </span>
            </button>
            {showMenu && (
              <div className={`absolute right-0 top-7 w-40
                rounded-xl shadow-xl z-20 overflow-hidden
                ${isDark
                  ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                  : 'bg-white border border-slate-200'
                }`}>
                {!column.isDefault && (
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onDeleteColumn(column._id)
                    }}
                    className="w-full flex items-center gap-2
                               px-3 py-2 text-sm text-red-500
                               hover:bg-red-500/10 transition-colors"
                  >
                    <span className="material-symbols-outlined
                                     text-[16px]">
                      delete
                    </span>
                    Delete column
                  </button>
                )}
                {column.isDefault && (
                  <div className="px-3 py-2 text-xs
                                  text-slate-500">
                    Default columns cannot be deleted
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column body */}
      <SortableContext
        items={tasks.map(t => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto px-2
          py-1.5 space-y-2 min-h-[80px]
          custom-scrollbar
          ${isDark
            ? 'bg-[rgba(255,255,255,0.02)]'
            : 'bg-slate-100/80'
          }`}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {isOver && (
            <div style={{
              height: '4px',
              borderRadius: '2px',
              background: '#6366f1',
              margin: '4px 0',
              opacity: 0.6,
            }} />
          )}
          {tasks.length === 0 && (
            <div className={`flex flex-col items-center
              justify-center h-32 border border-dashed
              rounded-xl gap-2 text-xs
              ${isDark
                ? 'border-[rgba(255,255,255,0.08)] text-slate-700'
                : 'border-slate-300 text-slate-400'
              }`}>
              <span className="material-symbols-outlined
                               text-[28px] opacity-40">
                inbox
              </span>
              <span>No tasks yet</span>
            </div>
          )}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-2"
          >
            {tasks.map(task => (
              <motion.div
                key={task._id}
                variants={taskCardVariant}
                layoutId={`task-${task._id}`}
                whileHover={{
                  y: -2,
                  boxShadow: isDark
                    ? '0 8px 24px rgba(0,0,0,0.4)'
                    : '0 8px 24px rgba(0,0,0,0.12)',
                  transition: { duration: 0.12 }
                }}
                whileTap={{ scale: 0.98 }}
              >
                <TaskCard
                  task={task}
                  isDark={isDark}
                  onClick={onTaskClick}
                  onDelete={onDeleteTask}
                  isDragging={isOver}
                  showConfirm={showConfirm}
                  canDelete={perms.canDeleteTask}
                  canUpdate={perms.canUpdateTask}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </SortableContext>

      {/* Column footer */}
      <div className={`px-2 pb-2
        ${isDark
          ? 'bg-[rgba(255,255,255,0.02)]'
          : 'bg-slate-100/80'
        }`}>
        <button
          onClick={() => onAddTask(column._id)}
          className={`w-full h-8 rounded-lg text-xs
            flex items-center justify-center gap-1
            border border-dashed transition-colors
            ${isDark
              ? 'border-[rgba(255,255,255,0.08)] text-slate-600 hover:bg-[rgba(255,255,255,0.04)] hover:text-slate-400'
              : 'border-slate-300 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600'
            }`}
        >
          <span className="material-symbols-outlined
                           text-[16px]">
            add
          </span>
          Add task
        </button>
      </div>
    </div>
  )
}

function TaskDetailPanel({
  task, columns, tasksByColumn, members, orgMembers, isDark,
  onClose, onUpdate, onDelete,
  showConfirm, showToast,
  attachments: externalAttachments, onAttachmentsChange,
  canDelete = true, canUpdate = true, canAssign = true
}) {
  const { user } = useSelector(s => s.auth)
  const [editTitle, setEditTitle] = useState(task.title)
  const [showAssignMenu, setShowAssignMenu] = useState(false) 
  const [addingSub, setAddingSub] = useState(false) 
  const [posting, setPosting] = useState(false) 
  const [isDragging, setIsDragging] = useState(false)

  const [showPriorityMenu, setShowPriorityMenu] =
    useState(false)
  const [showStatusMenu, setShowStatusMenu] =
    useState(false)
  const [showAssigneeMenu, setShowAssigneeMenu] =
    useState(false)
  const [editingDesc, setEditingDesc] =
    useState(false)
  const [editDesc, setEditDesc] =
    useState(task?.description || '')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsLoading, setCommentsLoading] =
    useState(false)
  const [submittingComment, setSubmittingComment] =
    useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false)
  const [subtasks, setSubtasks] =
    useState(task?.subtasks || [])
  const [showAddSubtask, setShowAddSubtask] =
    useState(false)
  const [subtaskForm, setSubtaskForm] = useState({
    title: '',
    priority: 'medium',
    startDate: '',
    dueDate: '',
    assignee: '',
    status: 'todo',
  })
  const [subtaskLoading, setSubtaskLoading] =
    useState(false)
  const [subtaskError, setSubtaskError] = useState('')
  const [attachments, setAttachments] = useState(task.attachments || [])
  const [draggingFile, setDraggingFile] = useState(false)
  const fileInputRef = useRef(null)

  // 2. resolvedAssignees MUST come before subtaskAssigneeOptions
  const resolvedAssignees = (task.assignees || [])
    .map(a => {
      if (a && typeof a === 'object' && a.name) {
        return a
      }
      const id = typeof a === 'object' ? a._id : a
      return members.find(m =>
        m._id?.toString() === id?.toString()
      ) || { _id: id, name: 'Member', avatar: null }
    })
    .filter(Boolean)

  // 3. Subtask assignees can be ANY project member
  const subtaskAssigneeOptions = members


  // 2. resolvedAssignees MUST come before subtaskAssigneeOptions

  // 3. NOW subtaskAssigneeOptions can safely use it

  const completedCount =
    subtasks.filter(s => s.completed ||
      s.status === 'done').length
  const progress = subtasks.length > 0
    ? Math.round(
        (completedCount / subtasks.length) * 100
      )
    : 0

  const SUBTASK_PRIORITY_CONFIG = {
    urgent: { color: '#ef4444', label: 'Urgent',
               emoji: '🔴' },
    high:   { color: '#f97316', label: 'High',
               emoji: '🟠' },
    medium: { color: '#eab308', label: 'Medium',
               emoji: '🟡' },
    low:    { color: '#94a3b8', label: 'Low',
               emoji: '⚪' },
  }

  const SUBTASK_STATUS_CONFIG = {
    todo: { color: '#94a3b8', label: 'To Do',
             bg: 'rgba(148,163,184,0.12)' },
    'in-progress': { color: '#6366f1',
                      label: 'In Progress',
                      bg: 'rgba(99,102,241,0.12)' },
    done: { color: '#10b981', label: 'Done',
             bg: 'rgba(16,185,129,0.12)' },
  }

  const MAX_ATTACHMENTS = 5
  const MAX_FILE_SIZE_MB = 10

  const detailPanelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-menu]')) {
        setShowPriorityMenu(false)
        setShowAssigneeMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () =>
      document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setSubtasks(task?.subtasks || [])
  }, [task?._id, task?.subtasks?.length])



  const handleAddSubtask = async () => {
    if (!subtaskForm.title.trim()) {
      setSubtaskError('Title is required')
      return
    }
    setSubtaskError('')
    setSubtaskLoading(true)
    try {
      const res = await api.post(
        `/tasks/${task._id}/subtasks`,
        {
          title: subtaskForm.title.trim(),
          priority: subtaskForm.priority,
          startDate: subtaskForm.startDate || null,
          dueDate: subtaskForm.dueDate || null,
          assignee: subtaskForm.assignee || null,
        }
      )
      setSubtasks(
        res.data?.data?.task?.subtasks || []
      )
      onUpdate(res.data?.data?.task)
      setSubtaskForm({
        title: '', priority: 'medium',
        startDate: '', dueDate: '',
        assignee: '', status: 'todo',
      })
      setShowAddSubtask(false)
    } catch (err) {
      setSubtaskError(
        err.response?.data?.message ||
        'Failed to add subtask'
      )
    } finally {
      setSubtaskLoading(false)
    }
  }

  const handleToggleSubtask = async (subtaskId) => {
    const sub = subtasks.find(
      s => s._id === subtaskId
    )
    const newCompleted = !sub?.completed
    
    // Optimistic Update
    setSubtasks(prev => prev.map(s =>
      s._id === subtaskId
        ? { ...s, completed: newCompleted,
            status: newCompleted ? 'done' : 'todo' }
        : s
    ))

    try {
      const res = await api.patch(
        `/tasks/${task._id}/subtasks/${subtaskId}`
      )
      const updatedTask = res.data?.data?.task
      if (updatedTask) {
        setSubtasks(updatedTask.subtasks || [])
        onUpdate(updatedTask)
      }
    } catch (err) {
      console.error('Subtask toggle error:', err)
      // Rollback
      setSubtasks(task.subtasks || [])
    }
  }

  const handleDeleteSubtask = async (subtaskId) => {
    setSubtasks(prev =>
      prev.filter(s => s._id !== subtaskId)
    )
    try {
      await api.delete(
        `/tasks/${task._id}/subtasks/${subtaskId}`
      )
    } catch {
      setSubtasks(task.subtasks || [])
    }
  }


  const currentColumn = columns.find(c => c._id === task.column)

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await api.get(`/tasks/${task._id}/comments`)
        setComments(res.data?.data?.comments || [])
      } catch (err) {
        console.error('Comments fetch error:', err)
      }
    }
    fetchComments()
  }, [task._id])

  // Save title on blur
  const handleTitleBlur = async () => {
    if (editTitle.trim() === task.title) return
    if (!editTitle.trim()) {
      setEditTitle(task.title)
      return
    }
    try {
      const res = await api.patch(`/tasks/${task._id}`, {
        title: editTitle.trim()
      })
      onUpdate(res.data?.data?.task)
    } catch (err) {
      console.error('Update title error:', err)
    }
  }

  // Save description
  const handleDescBlur = async () => {
    if (editDesc === (task.description || '')) return
    try {
      const res = await api.patch(`/tasks/${task._id}`,
        { description: editDesc })
      onUpdate(res.data?.data?.task)
      setEditingDesc(false)
    } catch (err) {
      console.error('Update desc error:', err)
    }
  }

  // Change priority
  const handlePriorityChange = async (newPriority) => {
    // Close menu first
    setShowPriorityMenu(false)

    // Optimistic update — instant visual feedback
    const optimistic = { ...task, priority: newPriority }
    onUpdate(optimistic)

    try {
      const res = await api.patch(
        `/tasks/${task._id}`,
        { priority: newPriority }
      )
      if (res.data?.data?.task) {
        onUpdate(res.data.data.task)
      }
    } catch (err) {
      console.error('Priority update failed:', err)
      onUpdate(task) // rollback
    }
  }



  // Assign member
  const handleAssign = async (memberId) => {
    setShowAssignMenu(false)
    const isAssigned = task.assignees?.some(
      a => (a._id || a) === memberId
    )
    try {
      if (isAssigned) {
        const res = await api.delete(
          `/tasks/${task._id}/assign/${memberId}`
        )
        onUpdate(res.data?.data?.task)
      } else {
        const res = await api.post(
          `/tasks/${task._id}/assign`,
          { assigneeId: memberId }
        )
        onUpdate(res.data?.data?.task)
      }
    } catch (err) {
      console.error('Assign error:', err)
    }
  }

  // Post comment
  const handlePostComment = async () => {
    if (!newComment.trim()) return
    try {
      setPosting(true)
      const res = await api.post(
        `/tasks/${task._id}/comments`,
        { content: newComment.trim() }
      )
      const comment = res.data?.data?.comment
      if (comment) setComments(prev => [...prev, comment])
      setNewComment('')
    } catch (err) {
      console.error('Comment post error:', err)
    } finally {
      setPosting(false)
    }
  }

  const priority = PRIORITY_CONFIG[task.priority] ||
                   PRIORITY_CONFIG.medium

  const handleDragOver = e => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = e => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }
  const [uploading, setUploading] = useState(false)
  const handleFiles = async (files) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExts = ['.pdf', '.doc', '.docx']

    // Check total limit
    if (attachments.length >= MAX_ATTACHMENTS) {
      showToast?.(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`, 'warning')
      return
    }

    const remaining = MAX_ATTACHMENTS - attachments.length

    // Filter valid types
    const typeValid = Array.from(files).filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase()
      return allowedTypes.includes(f.type) || allowedExts.includes(ext)
    })

    if (typeValid.length < files.length) {
      showToast?.('Only PDF and Word documents are allowed.', 'warning')
    }

    // Check file size
    const sizeValid = typeValid.filter(f => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast?.(`${f.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`, 'warning')
        return false
      }
      return true
    })

    // Check duplicates by name
    const existingNames = new Set(attachments.map(a => a.name.toLowerCase()))
    const noDupes = sizeValid.filter(f => {
      if (existingNames.has(f.name.toLowerCase())) {
        showToast?.(`${f.name} is already attached.`, 'warning')
        return false
      }
      return true
    })

    // Enforce remaining slots
    const toAdd = noDupes.slice(0, remaining)
    if (noDupes.length > remaining) {
      showToast?.(`Only ${remaining} more file(s) can be attached.`, 'warning')
    }

    if (toAdd.length === 0) return

    setUploading(true)
    try {
      const uploaded = [...attachments]
      for (const file of toAdd) {
        const formData = new FormData()
        formData.append('file', file)
        
        // 1. Upload file to server
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        
        const fileData = uploadRes.data?.data
        if (fileData?.url) {
          // 2. Attach to task
          const attachRes = await api.post(`/upload/task/${task._id}/attach`, {
            url: fileData.url,
            name: fileData.name || file.name,
            size: fileData.size || file.size
          })
          
          if (attachRes.data?.data?.attachments) {
            // Success - add to local list
            const serverAttachments = attachRes.data.data.attachments
            // The API usually returns the UPDATED attachments array
            uploaded.push(...serverAttachments.filter(sa => !uploaded.some(ua => ua.url === sa.url)))
          }
        }
      }
      
      setAttachments(uploaded)
      onUpdate({ ...task, attachments: uploaded })
      onAttachmentsChange?.(task._id, uploaded)
      showToast?.(`${toAdd.length} file(s) attached.`, 'success')
      
    } catch (err) {
      console.error('File upload error:', err)
      showToast?.(err.response?.data?.message || 'Failed to upload files', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      ref={detailPanelRef}
      variants={slideRight}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`fixed right-0 top-0 h-full w-[480px]
        flex flex-col z-50
        shadow-[-12px_0_40px_rgba(0,0,0,0.3)]
        md:w-[480px] w-full
        ${isDark
          ? 'bg-[#141414] border-l border-[rgba(255,255,255,0.07)]'
          : 'bg-white border-l border-slate-200'
        }`}
      style={{
        top: '0',
        zIndex: 50,
      }}
    >
      {/* Panel header */}
      <div className={`h-12 flex items-center
        justify-between px-4 border-b shrink-0
        ${isDark
          ? 'border-[rgba(255,255,255,0.06)]'
          : 'border-slate-200'
        }`}>
        <div className="flex items-center gap-1.5
                        text-[10px] font-medium
                        uppercase tracking-wider
                        text-slate-500">
          <span>Board</span>
          <span className="material-symbols-outlined
                           text-[12px]">
            chevron_right
          </span>
          <span>{currentColumn?.name || 'Column'}</span>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => {
                showConfirm({
                  title: 'Delete Task',
                  message: `Are you sure? ${task.title} will be gone forever.`,
                  confirmText: 'Delete',
                  confirmColor: 'red',
                  narrow: true,
                  onConfirm: () => {
                    onClose()
                    onDelete(task._id)
                  }
                })
              }}
              className={`p-1.5 rounded-md transition-colors
                text-red-400 hover:bg-red-500/10
                cursor-pointer`}
            >
              <span className="material-symbols-outlined
                               text-[18px]">
                delete
              </span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors
              ${isDark
                ? 'text-slate-500 hover:text-slate-200 hover:bg-[rgba(255,255,255,0.06)]'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
          >
            <span className="material-symbols-outlined
                             text-[18px]">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto
                      custom-scrollbar p-6">
        {/* Priority + Title */}
        <div className="flex items-start gap-2 mb-6">
          <span
            className="material-symbols-outlined
                       text-[20px] mt-1 shrink-0"
            style={{ color: priority.color }}
          >
            {priority.icon}
          </span>
          <textarea
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.target.blur()
              }
            }}
            rows={2}
            className={`flex-1 bg-transparent border-none
              p-0 text-xl font-semibold resize-none
              focus:outline-none focus:ring-0 leading-tight
              ${isDark ? 'text-white' : 'text-slate-900'}`}
          />
        </div>

        {/* Properties */}
        <div className={`rounded-xl p-4 mb-6 space-y-1
          ${isDark
            ? 'bg-[rgba(255,255,255,0.03)]'
            : 'bg-slate-50'
          }`}>

          {/* Assignees */}
          <div className="flex items-center min-h-[36px] relative">
            <span className={`w-28 text-xs font-medium
              ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Assignees
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
              <div className="flex flex-wrap gap-2">
                {resolvedAssignees.length === 0 ? (
                  <span style={{ fontSize: '12px', color: isDark ? '#334155' : '#94a3b8' }}>
                    No assignees
                  </span>
                ) : (
                  resolvedAssignees.map(a => (
                    <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px 3px 4px', borderRadius: '20px', background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}` }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', overflow: 'hidden', flexShrink: 0 }}>
                        {a.avatar ? <img src={a.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (a.name || 'M').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#a5b4fc' : '#6366f1' }}>
                        {a.name || a.email || 'Member'}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {canAssign && (
                <button
                  onClick={() => setShowAssignMenu(p => !p)}
                  style={{ padding: '2px 6px', borderRadius: '12px', border: 'none', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: isDark ? '#64748b' : '#94a3b8', fontSize: '11px', cursor: 'pointer' }}>
                  +
                </button>
              )}
            </div>
            {showAssignMenu && (
              <div className={`absolute left-28 top-9
                w-52 rounded-xl shadow-xl z-30
                overflow-hidden
                ${isDark
                  ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                  : 'bg-white border border-slate-200'
                }`}>
                {members.map(m => {
                  const memberId = m.user?._id || m._id
                  const name = m.user?.name || m.name
                  const isAssigned = task.assignees?.some(
                    a => (a._id || a) === memberId
                  )
                  return (
                    <button
                      key={memberId}
                      onClick={() => handleAssign(memberId)}
                      className={`w-full flex items-center
                        gap-2 px-3 py-2 text-sm
                        transition-colors text-left
                        ${isDark
                          ? 'hover:bg-white/5 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span className="size-6 rounded-full
                                       bg-indigo-500 text-white
                                       text-[10px] font-bold
                                       flex items-center
                                       justify-center shrink-0">
                        {name?.charAt(0) || '?'}
                      </span>
                      <span className="flex-1 truncate">
                        {name}
                      </span>
                      {isAssigned && (
                        <span className="material-symbols-outlined
                                         text-[14px] text-indigo-500">
                          check
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="flex items-center h-9 relative">
            <span className={`w-28 text-xs font-medium
              text-slate-500`}>
              Priority
            </span>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowPriorityMenu(prev => !prev)
              }}
              className={`flex items-center gap-1.5 px-2
                py-1 rounded-lg text-sm transition-colors
                ${isDark
                  ? 'hover:bg-[rgba(255,255,255,0.06)]'
                  : 'hover:bg-slate-100'
                }`}
              style={{ color: priority.color }}
            >
              <span className="material-symbols-outlined
                               text-[16px]">
                {priority.icon}
              </span>
              <span className="font-medium">
                {priority.label}
              </span>
            </button>
            {showPriorityMenu && (
              <div className={`absolute left-28 top-9
                w-44 rounded-xl shadow-xl z-30
                overflow-hidden
                ${isDark
                  ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                  : 'bg-white border border-slate-200'
                }`}>
                {Object.entries(PRIORITY_CONFIG).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()  // prevent blur
                        e.stopPropagation()
                        handlePriorityChange(key)
                      }}
                      className={`w-full flex items-center
                        gap-2 px-3 py-2 text-sm
                        transition-colors
                        ${isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-slate-50'
                        }`}
                      style={{ color: cfg.color }}
                    >
                      <span className="material-symbols-outlined
                                       text-[16px]">
                        {cfg.icon}
                      </span>
                      {cfg.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex items-center min-h-[36px] relative">
            <span className={`w-28 text-xs font-medium text-slate-500`}>
              Status
            </span>
            {(() => {
              // Find which column this task is in
              // by checking tasksByColumn state
              let currentColId = null
              let currentColName = 'To Do'

              // Method 1: Check task.column field
              if (task.column) {
                const colId = task.column?._id ||
                  task.column
                const found = columns.find(c =>
                  String(c._id) === String(colId)
                )
                if (found) {
                  currentColId = found._id
                  currentColName = found.name
                }
              }

              // Method 2: If not found, search tasksByColumn
              if (!currentColId) {
                for (const [colId, tasks] of
                     Object.entries(tasksByColumn)) {
                  const taskInCol = tasks.find(t =>
                    String(t._id) === String(task._id)
                  )
                  if (taskInCol) {
                    const col = columns.find(c =>
                      String(c._id) === String(colId)
                    )
                    if (col) {
                      currentColName = col.name
                    }
                    break
                  }
                }
              }

              const colConfig = {
                'To Do': {
                  color: '#94a3b8',
                  bg: 'rgba(148,163,184,0.12)',
                  icon: 'radio_button_unchecked'
                },
                'In Progress': {
                  color: '#6366f1',
                  bg: 'rgba(99,102,241,0.12)',
                  icon: 'pending'
                },
                'Review': {
                  color: '#f59e0b',
                  bg: 'rgba(245,158,11,0.12)',
                  icon: 'rate_review'
                },
                'Done': {
                  color: '#10b981',
                  bg: 'rgba(16,185,129,0.12)',
                  icon: 'check_circle'
                },
                'Testing': {
                  color: '#ec4899',
                  bg: 'rgba(236,72,153,0.12)',
                  icon: 'bug_report'
                },
              }

              // Match by contains for custom column names
              let cfg = colConfig[currentColName]
              if (!cfg) {
                // Fuzzy match
                const lower = currentColName.toLowerCase()
                if (lower.includes('progress'))
                  cfg = colConfig['In Progress']
                else if (lower.includes('review'))
                  cfg = colConfig['Review']
                else if (lower.includes('done') ||
                         lower.includes('complete'))
                  cfg = colConfig['Done']
                else if (lower.includes('test'))
                  cfg = colConfig['Testing']
                else cfg = colConfig['To Do']
              }

              return (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: cfg.bg,
                }}>
                  <span className="material-symbols-outlined"
                    style={{ fontSize: '13px',
                             color: cfg.color }}>
                    {cfg.icon}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: cfg.color,
                  }}>
                    {currentColName}
                  </span>
                </div>
              )
            })()}
          </div>
          {/* Start date */}
          <div className="flex items-center h-9">
            <span className={`w-28 text-xs font-medium text-slate-500`}>
              Start date
            </span>
            <input
              type="date"
              defaultValue={task.startDate
                ? new Date(task.startDate)
                    .toISOString().split('T')[0]
                : ''}
              onChange={async (e) => {
                const newDate = e.target.value;
                if (task.dueDate && newDate && newDate > new Date(task.dueDate).toISOString().split('T')[0]) {
                  showToast('Start date cannot be after due date', 'warning');
                  return;
                }
                try {
                  const res = await api.patch(
                    `/tasks/${task._id}`,
                    { startDate: newDate || null }
                  )
                  onUpdate(res.data?.data?.task)
                } catch (err) {
                  console.error('Start date error:', err)
                }
              }}
              className={`text-sm px-2 py-1 rounded-lg
                border-none outline-none cursor-pointer
                ${isDark
                  ? 'bg-transparent text-slate-300 [color-scheme:dark]'
                  : 'bg-transparent text-slate-700'
                }`}
            />
          </div>

          <div className="flex items-center h-9">
            <span className={`w-28 text-xs font-medium
              text-slate-500`}>
              Due date
            </span>
            <input
              type="date"
              defaultValue={task.dueDate
                ? new Date(task.dueDate)
                    .toISOString().split('T')[0]
                : ''}
              onChange={async (e) => {
                const newDate = e.target.value;
                // Simple validation against startDate if it exists
                if (task.startDate && newDate && newDate < new Date(task.startDate).toISOString().split('T')[0]) {
                  showToast('Due date cannot be before start date', 'warning');
                  return;
                }
                try {
                  const res = await api.patch(
                    `/tasks/${task._id}`,
                    { dueDate: newDate || null }
                  )
                  onUpdate(res.data?.data?.task)
                } catch (err) {
                  console.error('Due date error:', err)
                }
              }}
              className={`text-sm px-2 py-1 rounded-lg
                border-none outline-none cursor-pointer
                ${isDark
                  ? 'bg-transparent text-slate-300 [color-scheme:dark]'
                  : 'bg-transparent text-slate-700'
                }`}
            />
          </div>
        </div>

        {/* Description */}
        {/* Description */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold uppercase
              tracking-widest
              ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Description
            </p>
            {!editingDesc && (
              <button
                onClick={() => setEditingDesc(true)}
                className={`p-1 rounded transition-colors
                  cursor-pointer
                  ${isDark
                    ? 'text-slate-600 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.06)]'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}>
                <span className="material-symbols-outlined
                                 text-[16px]">edit</span>
              </button>
            )}
            {editingDesc && (
              <button
                onClick={() => {
                  handleDescBlur()
                }}
                className="px-2 py-0.5 rounded-md text-xs
                  font-semibold bg-indigo-600 text-white
                  cursor-pointer">
                Save
              </button>
            )}
          </div>
          {editingDesc ? (
            <RichTextEditor
              content={editDesc}
              onChange={(html) => setEditDesc(html)}
              isDark={isDark}
              placeholder="Add a description..."
              editable={editingDesc}
            />
          ) : (
            <div
              className="task-rich-content"
              onClick={() => setEditingDesc(true)}
              style={{
                fontSize: '14px',
                lineHeight: 1.7,
                color: isDark ? '#94a3b8' : '#64748b',
                minHeight: '60px',
                cursor: 'text',
              }}
              dangerouslySetInnerHTML={{
                __html: task.description ||
                  editDesc ||
                  `<p style="color:${isDark
                    ? '#334155' : '#cbd5e1'}">
                    Click to add a description...
                  </p>`
              }}
            />
          )}
        </div>

        {/* Subtasks */}
        <div style={{
          borderTop: isDark
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid #f1f5f9',
          paddingTop: '20px',
          marginBottom: '20px',
        }}>
          {/* ── Section Header ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '16px',
                         color: '#6366f1' }}>
                checklist
              </span>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isDark ? '#e2e8f0' : '#1e293b',
              }}>
                Subtasks
              </span>
              {subtasks.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: progress === 100
                      ? 'rgba(16,185,129,0.15)'
                      : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#f1f5f9',
                    color: progress === 100
                      ? '#10b981'
                      : isDark ? '#64748b' : '#94a3b8',
                  }}>
                    {completedCount}/{subtasks.length}
                  </span>
                </div>
              )}
              {subtasks.length >= 15 && (
                <span style={{
                  fontSize: '10px',
                  color: '#f59e0b',
                  background: 'rgba(245,158,11,0.1)',
                  padding: '1px 6px',
                  borderRadius: '6px',
                }}>
                  ⚠️ Complex task
                </span>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '2px',
              height: '6px',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              {subtasks.length > 0 ? subtasks.map((s, idx) => (
                <div key={s._id || idx} style={{
                  flex: 1,
                  background: s.completed || s.status === 'done'
                    ? '#10b981'
                    : s.status === 'in-progress'
                      ? '#6366f1'
                      : 'transparent',
                  transition: 'all 0.3s ease'
                }} />
              )) : (
                <div style={{ flex: 1, background: 'transparent' }} />
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowAddSubtask(v => !v)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '8px',
                border: '1.5px solid #6366f1',
                background: showAddSubtask
                  ? '#6366f1'
                  : 'rgba(99,102,241,0.08)',
                color: showAddSubtask
                  ? '#ffffff' : '#6366f1',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                zIndex: 10,
                position: 'relative',
                transition: 'all 150ms ease',
              }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '14px',
                         pointerEvents: 'none' }}>
                {showAddSubtask ? 'close' : 'add'}
              </span>
              {showAddSubtask ? 'Cancel' : 'Add Subtask'}
            </button>
          </div>

          {/* ── Segmented Progress Bar ── */}
          {subtasks.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isDark ? '#334155' : '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  Progress
                </span>
                <motion.p
                  key={progress}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: progress === 100
                      ? '#10b981'
                      : isDark ? '#6366f1' : '#6366f1',
                    margin: 0
                  }}
                >
                  {completedCount} of {subtasks.length} completed
                </motion.p>
              </div>
              {/* Segmented bar — one segment per subtask */}
              <div style={{
                height: '6px',
                borderRadius: '3px',
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9',
                overflow: 'hidden',
                display: 'flex',
                gap: '2px',
              }}>
                {subtasks.map((sub, idx) => (
                  <motion.div
                    key={sub._id || idx}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: idx * 0.05,
                      ease: [0, 0, 0.2, 1],
                    }}
                    style={{
                      flex: 1,
                      transformOrigin: 'left',
                      borderRadius: '2px',
                      background: sub.completed || sub.status === 'done'
                        ? '#10b981'
                        : sub.status === 'in-progress'
                        ? '#6366f1'
                        : 'rgba(148,163,184,0.2)',
                      transition: 'background 300ms ease',
                    }}
                  />
                ))}
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '6px',
              }}>
                {[
                  { color: '#10b981', label: 'Done' },
                  { color: '#6366f1', label: 'In Progress' },
                  { color: isDark ? 'rgba(255,255,255,0.08)'
                                  : '#e2e8f0', label: 'To Do' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <div style={{
                      width: '8px', height: '8px',
                      borderRadius: '2px',
                      background: item.color,
                    }} />
                    <span style={{
                      fontSize: '10px',
                      color: isDark ? '#334155' : '#94a3b8',
                    }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Add Subtask Form ── */}
          {showAddSubtask && (
            <div style={{
              marginBottom: '14px',
              borderRadius: '12px',
              border: `1.5px solid rgba(99,102,241,0.3)`,
              background: isDark
                ? 'rgba(99,102,241,0.04)'
                : 'rgba(99,102,241,0.02)',
              overflow: 'hidden',
            }}>
              {/* Form header */}
              <div style={{
                padding: '10px 14px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '4px',
                  height: '32px',
                  borderRadius: '2px',
                  background: SUBTASK_PRIORITY_CONFIG[
                    subtaskForm.priority
                  ]?.color || '#eab308',
                  flexShrink: 0,
                }} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Subtask title..."
                  value={subtaskForm.title}
                  onChange={e => {
                    setSubtaskForm(f => ({
                      ...f, title: e.target.value
                    }))
                    setSubtaskError('')
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubtask()
                    if (e.key === 'Escape') {
                      setShowAddSubtask(false)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isDark ? '#e2e8f0' : '#1e293b',
                  }}
                />
              </div>

              {subtaskError && (
                <p style={{
                  fontSize: '11px',
                  color: '#ef4444',
                  padding: '0 14px 6px 26px',
                  margin: 0,
                }}>
                  {subtaskError}
                </p>
              )}

              {/* Form fields row */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '10px 14px',
                borderTop: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#f1f5f9'}`,
              }}>

                {/* Priority picker */}
                <div>
                  <label style={{
                    fontSize: '9px', fontWeight: 700,
                    color: isDark ? '#475569' : '#94a3b8',
                    display: 'block', marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>Priority</label>
                  <div style={{
                    display: 'flex', gap: '4px',
                  }}>
                    {Object.entries(
                      SUBTASK_PRIORITY_CONFIG
                    ).map(([val, cfg]) => (
                      <button
                        key={val}
                        type="button"
                        title={cfg.label}
                        onClick={() => setSubtaskForm(f => ({
                          ...f, priority: val
                        }))}
                        style={{
                          width: '28px', height: '28px',
                          borderRadius: '6px',
                          border: subtaskForm.priority === val
                            ? `2px solid ${cfg.color}`
                            : `1px solid ${isDark
                                ? 'rgba(255,255,255,0.08)'
                                : '#e2e8f0'}`,
                          background: subtaskForm.priority === val
                            ? `${cfg.color}20`
                            : 'transparent',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {cfg.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{
                      fontSize: '9px', fontWeight: 700,
                      color: isDark ? '#475569' : '#94a3b8',
                      display: 'block', marginBottom: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      Assignee
                    </label>
                  <select
                    value={subtaskForm.assignee}
                    onChange={e => setSubtaskForm(f => ({
                      ...f, assignee: e.target.value
                    }))}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '7px',
                      border: `1px solid ${isDark
                        ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                      background: isDark ? '#1a1a1a' : '#fff',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}>
                    <option value="">Unassigned</option>
                    {subtaskAssigneeOptions.map(m => (
                      <option key={m._id} value={m._id}>
                        {m.name || m.email || 'Member'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start date */}
                <div>
                  <label style={{
                    fontSize: '9px', fontWeight: 700,
                    color: isDark ? '#475569' : '#94a3b8',
                    display: 'block', marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>Start</label>
                  <input
                    type="date"
                    value={subtaskForm.startDate}
                    max={subtaskForm.dueDate ||
                      (task.dueDate
                        ? new Date(task.dueDate)
                            .toISOString().split('T')[0]
                        : undefined)
                    }
                    onChange={e => setSubtaskForm(f => ({
                      ...f, startDate: e.target.value
                    }))}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '7px',
                      border: `1px solid ${isDark
                        ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                      background: isDark ? '#1a1a1a' : '#fff',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '11px',
                      outline: 'none',
                      colorScheme: isDark ? 'dark' : 'light',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Due date */}
                <div>
                  <label style={{
                    fontSize: '9px', fontWeight: 700,
                    color: isDark ? '#475569' : '#94a3b8',
                    display: 'block', marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    Due
                    {task.dueDate && (
                      <span style={{
                        color: '#f59e0b',
                        marginLeft: '4px',
                        fontWeight: 400,
                      }}>
                        ≤ {new Date(task.dueDate)
                          .toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric'
                          })}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={subtaskForm.dueDate}
                    min={subtaskForm.startDate || undefined}
                    max={task.dueDate
                      ? new Date(task.dueDate)
                          .toISOString().split('T')[0]
                      : undefined
                    }
                    onChange={e => setSubtaskForm(f => ({
                      ...f, dueDate: e.target.value
                    }))}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '7px',
                      border: `1px solid ${isDark
                        ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                      background: isDark ? '#1a1a1a' : '#fff',
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      fontSize: '11px',
                      outline: 'none',
                      colorScheme: isDark ? 'dark' : 'light',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              {/* Form actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '0 14px 12px',
              }}>
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={!subtaskForm.title.trim()
                    || subtaskLoading}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: subtaskForm.title.trim()
                      ? '#6366f1' : isDark
                        ? '#1e293b' : '#e2e8f0',
                    color: subtaskForm.title.trim()
                      ? '#fff'
                      : isDark ? '#334155' : '#94a3b8',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: subtaskForm.title.trim()
                      ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms',
                  }}>
                  {subtaskLoading
                    ? 'Adding...' : '+ Add Subtask'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubtask(false)
                    setSubtaskError('')
                    setSubtaskForm({
                      title: '', priority: 'medium',
                      startDate: '', dueDate: '',
                      assignee: '', status: 'todo',
                    })
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: `1px solid ${isDark
                      ? 'rgba(255,255,255,0.08)'
                      : '#e2e8f0'}`,
                    color: isDark ? '#475569' : '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Subtask List (Jira/ClickUp card style) ── */}
          {subtasks.length === 0 && !showAddSubtask ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowAddSubtask(true)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: `1.5px dashed ${isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#e2e8f0'}`,
                background: 'transparent',
                color: isDark ? '#334155' : '#cbd5e1',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: '16px' }}>
                splitscreen_add
              </span>
              Break this task into subtasks
            </button>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {subtasks.map((sub, idx) => {
                const priConfig = SUBTASK_PRIORITY_CONFIG[
                  sub.priority || 'medium'
                ]
                const stConfig = SUBTASK_STATUS_CONFIG[
                  sub.completed ? 'done'
                  : sub.status || 'todo'
                ]
                const subAssignee = members.find(m =>
                  m._id?.toString() ===
                    (sub.assignee?._id ||
                     sub.assignee)?.toString()
                )
                const isOverdue = sub.dueDate &&
                  !sub.completed &&
                  new Date(sub.dueDate) < new Date()

                return (
                  <div key={sub._id || idx} style={{
                    display: 'flex',
                    borderRadius: '10px',
                    border: `1px solid ${isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#f1f5f9'}`,
                    background: sub.completed
                      ? isDark
                        ? 'rgba(255,255,255,0.01)'
                        : '#fafafa'
                      : isDark
                        ? 'rgba(255,255,255,0.03)'
                        : '#ffffff',
                    overflow: 'hidden',
                    transition: 'box-shadow 150ms ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow =
                      isDark
                        ? '0 2px 8px rgba(0,0,0,0.3)'
                        : '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'none'
                  }}>

                    {/* Priority left border */}
                    <div style={{
                      width: '4px',
                      flexShrink: 0,
                      background: priConfig?.color
                        || '#eab308',
                      opacity: sub.completed ? 0.3 : 1,
                    }} />

                    {/* Content */}
                    <div style={{
                      flex: 1,
                      padding: '10px 12px',
                      minWidth: 0,
                    }}>
                      {/* Top row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSubtask(sub._id)}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            border: sub.completed
                              ? 'none'
                              : `2px solid ${isDark
                                  ? '#334155' : '#cbd5e1'}`,
                            background: sub.completed
                              ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 150ms ease',
                          }}>
                          {sub.completed && (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '12px',
                                       color: 'white',
                                       pointerEvents: 'none' }}>
                              check
                            </span>
                          )}
                        </button>

                        {/* Title */}
                        <span style={{
                          flex: 1,
                          fontSize: '13px',
                          fontWeight: 500,
                          color: sub.completed
                            ? isDark ? '#334155' : '#94a3b8'
                            : isDark ? '#e2e8f0' : '#1e293b',
                          textDecoration: sub.completed
                            ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {sub.title}
                        </span>

                        {/* Status pill */}
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: stConfig?.bg,
                          color: stConfig?.color,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {stConfig?.label}
                        </span>
                      </div>

                      {/* Bottom meta row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '6px',
                        paddingLeft: '26px',
                      }}>
                        {/* Priority badge */}
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: priConfig?.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}>
                          <div style={{
                            width: '6px', height: '6px',
                            borderRadius: '50%',
                            background: priConfig?.color,
                          }} />
                          {priConfig?.label}
                        </span>

                        {/* Assignee */}
                        {subAssignee && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <div style={{
                              width: '16px', height: '16px',
                              borderRadius: '50%',
                              background: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              fontWeight: 700,
                              color: 'white',
                              overflow: 'hidden',
                            }}>
                              {subAssignee.avatar
                                ? <img src={subAssignee.avatar}
                                    style={{ width: '16px',
                                      height: '16px',
                                      objectFit: 'cover' }} />
                                : subAssignee.name
                                    ?.charAt(0)
                                    .toUpperCase()
                              }
                            </div>
                            <span style={{
                              fontSize: '10px',
                              color: isDark
                                ? '#475569' : '#94a3b8',
                            }}>
                              {subAssignee.name?.split(' ')[0]}
                            </span>
                          </div>
                        )}

                        {/* Date range */}
                        {(sub.startDate || sub.dueDate) && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '10px',
                            color: isOverdue
                              ? '#ef4444'
                              : isDark ? '#334155' : '#94a3b8',
                          }}>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '11px',
                                color: isOverdue
                                  ? '#ef4444'
                                  : isDark
                                    ? '#334155' : '#94a3b8',
                              }}>
                              calendar_today
                            </span>
                            {sub.startDate && (
                              <span>
                                {new Date(sub.startDate)
                                  .toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                              </span>
                            )}
                            {sub.startDate && sub.dueDate &&
                              <span>→</span>
                            }
                            {sub.dueDate && (
                              <span style={{
                                fontWeight: isOverdue ? 700 : 400,
                              }}>
                                {new Date(sub.dueDate)
                                  .toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                {isOverdue && ' ⚠️'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Spacer + Delete */}
                        <div style={{ marginLeft: 'auto' }}>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSubtask(sub._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              color: isDark
                                ? '#1e293b' : '#e2e8f0',
                              display: 'flex',
                              transition: 'all 150ms',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color =
                                '#ef4444'
                              e.currentTarget.style.background =
                                'rgba(239,68,68,0.1)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color =
                                isDark ? '#1e293b' : '#e2e8f0'
                              e.currentTarget.style.background =
                                'transparent'
                            }}>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '13px',
                                pointerEvents: 'none' }}>
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#475569' : '#94a3b8' }}>
                Attachments
              </p>
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: attachments.length >= MAX_ATTACHMENTS ? '#f59e0b' : (isDark ? '#475569' : '#94a3b8'), fontWeight: 600 }}>
                {attachments.length}/{MAX_ATTACHMENTS}
              </span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`text-xs font-semibold
                ${isDark ? 'text-indigo-400' : 'text-indigo-600'}
                hover:underline`}>
              + Add
            </button>
            <input type="file" ref={fileInputRef} className="hidden"
              accept=".pdf,.doc,.docx"
              multiple onChange={e => handleFiles(Array.from(e.target.files))} />
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4
              transition-colors
              ${isDragging
                ? 'border-indigo-500 bg-indigo-500/5'
                : isDark
                  ? 'border-[rgba(255,255,255,0.08)]'
                  : 'border-slate-200'
              }`}>
            {attachments.length === 0 ? (
              <div className="text-center py-4 opacity-60">
                <span className="material-symbols-outlined
                                 text-[24px] mb-1">
                  cloud_upload
                </span>
                <p className="text-xs">Drag and drop files here</p>
                <p className="text-[10px] mt-1 text-slate-500 italic">PDF and Word only</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att._id} className={`flex items-center
                    gap-3 p-2.5 rounded-xl border group
                    ${isDark
                      ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]'
                      : 'bg-white border-slate-200'
                    }`}>
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0
                      ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {att.name?.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <a href={att.url} target="_blank" rel="noreferrer"
                         className={`text-xs font-medium truncate block hover:underline
                           ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {att.name}
                      </a>
                      <p className="text-[10px] text-slate-500">
                        {att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                        {att.uploadedAt && ` • ${new Date(att.uploadedAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.delete(`/upload/task/${task._id}/attachments/${att._id}`);
                          const updated = attachments.filter(a => a._id !== att._id);
                          setAttachments(updated);
                          onUpdate({ ...task, attachments: updated });
                          onAttachmentsChange?.(task._id, updated);
                        } catch (err) {
                          console.error('Delete attachment error:', err);
                        }
                      }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all
                        text-red-400 hover:bg-red-500/10 cursor-pointer`}
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
                {uploading && (
                  <div className="flex items-center gap-2 p-2 text-xs text-slate-500 italic">
                    <div className="size-3 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
                    Uploading files...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity + Comments */}
        <div className={`border-t pt-6
          ${isDark
            ? 'border-[rgba(255,255,255,0.06)]'
            : 'border-slate-100'
          }`}>
          <p className={`text-xs font-semibold uppercase
            tracking-widest mb-4
            ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Activity
          </p>

          {/* Task activity log */}
          {task.activity?.length > 0 && (
            <div className="space-y-3 mb-4">
              {task.activity.slice(-5).map((act, i) => (
                <div key={i}
                     className="flex gap-2 items-start">
                  <div className={`size-5 rounded-full
                    flex items-center justify-center
                    shrink-0
                    ${isDark
                      ? 'bg-[rgba(255,255,255,0.06)]'
                      : 'bg-slate-100'
                    }`}>
                    <span className="material-symbols-outlined
                                     text-[11px] text-slate-500">
                      edit
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs leading-relaxed
                      ${isDark
                        ? 'text-slate-500'
                        : 'text-slate-500'
                      }`}>
                      {act.action}
                    </p>
                    <span className="text-[10px] text-slate-600">
                      {timeAgo(act.createdAt || new Date())}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comments list */}
          <div className="space-y-4 mb-4">
            {comments.length === 0 ? (
              <p className={`text-xs italic
                ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>
                No comments yet. Be the first to comment.
              </p>
            ) : (
              comments.map(comment => (
                <div key={comment._id}
                     className="flex gap-3 items-start">
                  <div className="size-7 rounded-full
                    bg-indigo-500 text-white
                    text-[10px] font-bold
                    flex items-center justify-center
                    shrink-0 overflow-hidden">
                    {comment.author?.avatar
                      ? <img src={comment.author.avatar}
                             className="w-full h-full
                                        object-cover" />
                      : comment.author?.name?.charAt(0)
                          ?.toUpperCase() || '?'
                    }
                  </div>
                  <div className={`flex-1 rounded-xl p-3
                    ${isDark
                      ? 'bg-[rgba(255,255,255,0.04)]'
                      : 'bg-slate-50'
                    }`}>
                    <div className="flex items-center
                                    justify-between mb-1">
                      <span className={`text-xs font-semibold
                        ${isDark
                          ? 'text-slate-200'
                          : 'text-slate-800'
                        }`}>
                        {comment.author?.name || 'Unknown'}
                      </span>
                      <span className="text-[10px]
                                       text-slate-500">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed
                      ${isDark
                        ? 'text-slate-400'
                        : 'text-slate-600'
                      }`}>
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className={`p-4 border-t shrink-0
        ${isDark
          ? 'border-[rgba(255,255,255,0.06)] bg-[#141414]'
          : 'border-slate-100 bg-white'
        }`}>
        <div className={`flex items-center gap-2
          rounded-xl px-3 py-2 border
          ${isDark
            ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.07)]'
            : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="size-6 rounded-full bg-indigo-500
                          text-white text-[10px] font-bold
                          flex items-center justify-center
                          shrink-0">
            {user?.name?.charAt(0) || '?'}
          </div>
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey)
                handlePostComment()
            }}
            className={`flex-1 bg-transparent border-none
              outline-none text-sm
              ${isDark
                ? 'text-white placeholder-slate-700'
                : 'text-slate-900 placeholder-slate-400'
              }`}
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            className="text-indigo-500 disabled:opacity-30
                       transition-opacity"
          >
            <span className="material-symbols-outlined
                             text-[18px]">
              send
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function CreateTaskModal({
  boardId, columns, members, isDark,
  onClose, onTaskCreated,
  createInColumn, tasksByColumn,
}) {
  const [showColDrop, setShowColDrop] = useState(false)
  const [showPriorityDrop, setShowPriorityDrop] =
    useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    columnId: createInColumn || columns[0]?._id || '',
    priority: 'medium',
    assignees: [],
    labels: '',
    dueDate: '',
    startDate: '',
  })
  
  // Retaining required existing states
  const [creating, setCreating] = useState(false)
  const [assignees, setAssignees] = useState([])
  const [showAssignPicker, setShowAssignPicker] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        setShowColDrop(false)
        setShowPriorityDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () =>
      document.removeEventListener('mousedown', handler)
  }, [])

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError('Task title is required')
      return
    }
    if (!form.columnId) {
      setError('Please select a column')
      return
    }

    // Date validation
    if (form.startDate && form.dueDate &&
        form.startDate > form.dueDate) {
      setError(
        'Start date cannot be after due date'
      )
      return
    }

    // Duplicate name check
    const allTasks = Object.values(tasksByColumn)
      .flat()
    const isDuplicate = allTasks.some(t =>
      t.title?.toLowerCase().trim() ===
      form.title.toLowerCase().trim()
    )
    if (isDuplicate) {
      setError(
        `"${form.title}" already exists. ` +
        `Use a unique name.`
      )
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || '',
        priority: form.priority || 'medium',
        assignees: assignees.length > 0 ? assignees : [],
        labels: form.labels
          ? form.labels.split(',')
              .map(l => l.trim()).filter(Boolean)
          : [],
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
      }

      const res = await api.post(
        `/boards/${boardId}/columns/${form.columnId}/tasks`,
        payload
      )

      const newTask = res.data?.data?.task
      if (newTask) {
        onTaskCreated(newTask)
      }
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to create task'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60
                 backdrop-blur-sm z-[60] flex
                 items-center justify-center p-4"
    >
      <motion.div 
        variants={slideUp}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          borderRadius: '24px',
          boxShadow: isDark 
            ? '0 25px 70px -12px rgba(0,0,0,0.8), 0 0 50px rgba(99,102,241,0.08)' 
            : '0 25px 70px -12px rgba(0,0,0,0.18)',
          backgroundColor: isDark ? '#111111' : '#fff',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className={`px-8 py-6 border-b flex
          items-center justify-between
          ${isDark
            ? 'border-[rgba(255,255,255,0.06)] bg-white/[0.01]'
            : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className="flex flex-col">
            <h2 className={`text-xl font-bold
              ${isDark ? 'text-white' : 'text-slate-900'}`}>
              New Task
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Fill in the details to create a new task
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95
              ${isDark
                ? 'text-slate-500 hover:text-slate-200 hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
              }`}
          >
            <span className="material-symbols-outlined
                             text-[24px]">
              close
            </span>
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl text-sm mb-6 flex items-center gap-3
              ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                       : 'bg-red-50 text-red-600 border border-red-100'}`}>
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </motion.div>
          )}

          <div>
            <label className={`block text-[10px] font-bold
              uppercase tracking-widest mb-2
              ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Task Title
            </label>
            <input
              id="task-title"
              name="taskTitle"
              autoFocus
              required
              type="text"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className={`w-full px-4 py-3.5 rounded-2xl
                border text-lg font-semibold transition-all focus:ring-4
                focus:ring-indigo-500/10 outline-none
                ${isDark
                  ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder-slate-800 focus:border-indigo-500/50'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300 focus:border-indigo-500'
                }`}
            />
          </div>

          <div>
            <label className={`block text-[10px] font-bold
              uppercase tracking-widest mb-2
              ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Description
            </label>
            <div className={`rounded-2xl overflow-hidden border
              ${isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-slate-200'}`}>
              <RichTextEditor
                content={form.description}
                onChange={(html) => setForm({...form, description: html})}
                isDark={isDark}
                placeholder="Add more details about this task..."
                editable={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold
                uppercase tracking-wider mb-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Priority
              </label>
              {/* Priority Select code */}
              <div data-dropdown className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowPriorityDrop(p => !p)
                    setShowColDrop(false)
                  }}
                  className={`w-full flex items-center
                    justify-between px-4 py-3 rounded-2xl
                    text-sm border text-left cursor-pointer transition-all
                    ${isDark
                      ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white hover:bg-white/[0.07]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                    }`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined
                                     text-[16px]"
                      style={{
                        color: [
                          { value: 'urgent', color: '#ef4444', icon: 'flag' },
                          { value: 'high', color: '#f97316', icon: 'keyboard_arrow_up' },
                          { value: 'medium', color: '#eab308', icon: 'remove' },
                          { value: 'low', color: '#94a3b8', icon: 'keyboard_arrow_down' },
                        ].find(p => p.value === form.priority)?.color
                      }}>
                      {[
                        { value: 'urgent', color: '#ef4444', icon: 'flag' },
                        { value: 'high', color: '#f97316', icon: 'keyboard_arrow_up' },
                        { value: 'medium', color: '#eab308', icon: 'remove' },
                        { value: 'low', color: '#94a3b8', icon: 'keyboard_arrow_down' },
                      ].find(p => p.value === form.priority)?.icon || 'remove'}
                    </span>
                    <span>
                      {[
                        { value: 'urgent', label: 'Urgent' },
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                      ].find(p => p.value === form.priority)?.label || 'Medium'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined
                                   text-[18px] text-slate-400">
                    expand_more
                  </span>
                </button>
                {showPriorityDrop && (
                  <div className={`absolute top-full left-0
                    right-0 mt-1 rounded-xl z-20 overflow-hidden
                    shadow-xl border
                    ${isDark
                      ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]'
                      : 'bg-white border-slate-200'
                    }`}>
                    {[
                      { value: 'urgent', label: 'Urgent', color: '#ef4444', icon: 'flag' },
                      { value: 'high', label: 'High', color: '#f97316', icon: 'keyboard_arrow_up' },
                      { value: 'medium', label: 'Medium', color: '#eab308', icon: 'remove' },
                      { value: 'low', label: 'Low', color: '#94a3b8', icon: 'keyboard_arrow_down' },
                    ].map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setForm(f => ({
                            ...f, priority: p.value
                          }))
                          setShowPriorityDrop(false)
                        }}
                        className={`w-full flex items-center
                          gap-2 px-3 py-2.5 text-sm text-left
                          transition-colors cursor-pointer
                          ${form.priority === p.value
                            ? isDark
                              ? 'bg-white/5'
                              : 'bg-slate-50'
                            : isDark
                              ? 'hover:bg-white/5'
                              : 'hover:bg-slate-50'
                          }`}>
                        <span
                          className="material-symbols-outlined
                                     text-[16px]"
                          style={{ color: p.color }}>
                          {p.icon}
                        </span>
                        <span className={isDark
                          ? 'text-slate-300' : 'text-slate-700'}>
                          {p.label}
                        </span>
                        {form.priority === p.value && (
                          <span className="material-symbols-outlined
                            text-[14px] text-indigo-500 ml-auto">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={`block text-xs font-bold
                uppercase tracking-wider mb-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Column
              </label>
              <div data-dropdown className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowColDrop(p => !p)
                    setShowPriorityDrop(false)
                  }}
                  className={`w-full flex items-center
                    justify-between px-4 py-3 rounded-2xl
                    text-sm border text-left cursor-pointer transition-all
                    ${isDark
                      ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white hover:bg-white/[0.07]'
                      : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                    }`}>
                  <span>
                    {columns.find(c => c._id === form.columnId)
                      ?.name || 'Select column'}
                  </span>
                  <span className="material-symbols-outlined
                                   text-[18px] text-slate-400">
                    expand_more
                  </span>
                </button>
                {showColDrop && (
                  <div className={`absolute top-full left-0
                    right-0 mt-1 rounded-xl z-20 overflow-hidden
                    shadow-xl border
                    ${isDark
                      ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]'
                      : 'bg-white border-slate-200'
                    }`}>
                    {columns.map(col => (
                      <button
                        key={col._id}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, columnId: col._id }))
                          setShowColDrop(false)
                        }}
                        className={`w-full flex items-center
                          gap-2 px-3 py-2.5 text-sm text-left
                          transition-colors cursor-pointer
                          ${form.columnId === col._id
                            ? isDark
                              ? 'bg-indigo-500/10 text-indigo-400'
                              : 'bg-indigo-50 text-indigo-600'
                            : isDark
                              ? 'text-slate-300 hover:bg-white/5'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}>
                        <div className="size-2 rounded-full"
                          style={{
                            backgroundColor:
                              col.name === 'Done' ? '#10b981' :
                              col.name === 'In Progress' ? '#6366f1' :
                              col.name === 'Review' ? '#f59e0b' :
                              '#94a3b8'
                          }} />
                        {col.name}
                        {form.columnId === col._id && (
                          <span className="material-symbols-outlined
                            text-[14px] text-indigo-500 ml-auto">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold
                uppercase tracking-wider mb-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Start Date
              </label>
              <input
                type="date"
                id="task-start-date"
                name="taskStartDate"
                value={form.startDate || ''}
                max={form.dueDate || undefined}
                onChange={e => setForm({...form, startDate: e.target.value})}
                className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none cursor-pointer transition-all
                  ${isDark ? 'bg-[rgba(255,255,255,0.04)] border-white/10 text-slate-100 color-scheme-dark hover:bg-white/[0.07]' 
                           : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'}`}
              />
            </div>
            <div>
              <label className={`block text-[10px] font-bold
                uppercase tracking-widest mb-2
                ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Due Date
              </label>
              <input
                type="date"
                id="task-due-date"
                name="taskDueDate"
                value={form.dueDate || ''}
                min={form.startDate || undefined}
                onChange={e => setForm({...form, dueDate: e.target.value})}
                className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none cursor-pointer transition-all
                  ${isDark ? 'bg-[rgba(255,255,255,0.04)] border-white/10 text-slate-100 color-scheme-dark hover:bg-white/[0.07]' 
                           : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'}`}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className={`block text-[10px] font-bold
                uppercase tracking-widest mb-2
                ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Labels (comma separated)
              </label>
              <input
                id="task-labels"
                name="taskLabels"
                type="text"
                placeholder="feat, bug, ui..."
                value={form.labels}
                onChange={e => setForm({...form, labels: e.target.value})}
                className={`w-full px-4 py-3 rounded-2xl
                  border text-sm transition-all outline-none
                  ${isDark
                    ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white placeholder-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-300'
                  }`}
              />
            </div>

            <div className="relative pt-6 z-10 text-right">
              <button
                type="button"
                onClick={() => setShowAssignPicker(p => !p)}
                className={`h-9 px-3 rounded-xl text-sm
                  font-medium flex items-center justify-end gap-1.5 transition-colors
                  ${isDark
                    ? 'bg-[rgba(255,255,255,0.06)] text-slate-300 hover:bg-[rgba(255,255,255,0.1)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span className="material-symbols-outlined
                                 text-[16px]">person</span>
                {assignees.length > 0
                  ? `${assignees.length} assigned`
                  : 'Assign'}
              </button>

              {showAssignPicker && members.length > 0 && (
                <div className={`absolute bottom-full mb-2 right-0 w-52
                  rounded-xl shadow-xl z-50 overflow-hidden
                  ${isDark
                    ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)]'
                    : 'bg-white border border-slate-200 shadow-lg'
                  }`}>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    {members.map(m => {
                      const id = m._id?.toString()
                      const name = m.name || '?'
                      const isSelected = assignees.includes(id)
                      return (
                        <button key={id} type="button"
                          onClick={() => setAssignees(prev =>
                            isSelected
                              ? prev.filter(a => a !== id)
                              : [...prev, id]
                          )}
                          className={`w-full flex items-center
                            gap-2 px-3 py-2 text-sm text-left
                            transition-colors
                            ${isDark
                              ? 'hover:bg-white/5 text-slate-300'
                              : 'hover:bg-slate-50 text-slate-700'
                            }`}>
                          <div className="size-6 rounded-full
                            bg-indigo-500 text-white text-[10px]
                            font-bold flex items-center
                            justify-center shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 truncate">
                            {name}
                          </span>
                          {isSelected && (
                            <span className="material-symbols-outlined
                              text-[14px] text-indigo-500">check</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4 mt-8 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-2xl text-sm
                font-bold border transition-all active:scale-95
                ${isDark
                  ? 'border-[rgba(255,255,255,0.1)] text-slate-400 hover:bg-white/5 hover:text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="px-8 py-3 rounded-2xl text-sm
                         font-bold bg-indigo-600
                         hover:bg-indigo-700 text-white
                         shadow-[0_10px_20px_-5px_rgba(79,70,229,0.3)]
                         hover:shadow-[0_15px_30px_-5px_rgba(79,70,229,0.4)]
                         transition-all active:scale-95
                         disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProjectMembersPanel({
  isDark, projectId, orgId,
  projectMembers, orgMembers,
  onClose, onMembersUpdated,
  showConfirmInPanel
}) {
  const [adding, setAdding] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [panelError, setPanelError] = useState(null)

  const projectMemberIds = projectMembers.map(
    m => m._id?.toString() || m?.toString()
  )

  const availableToAdd = orgMembers.filter(m => {
    const userId = (m.user?._id || m._id)?.toString()
    return !projectMemberIds.includes(userId)
  })

  const getMemberRole = (userId) => {
    const orgMember = orgMembers.find(m =>
      (m.user?._id || m._id)?.toString() ===
      userId?.toString()
    )
    return orgMember?.role || 'developer'
  }

  const handleAdd = async (email, userId) => {
    try {
      setAdding(userId)
      setPanelError(null)
      await api.post(
        `/organizations/${orgId}/projects/${projectId}/members`,
        { email }
      )
      onMembersUpdated()
    } catch (err) {
      setPanelError(err.response?.data?.message || 'Failed to add member')
    } finally {
      setAdding(null)
    }
  }

  const handleRemove = async (userId, name) => {
    showConfirmInPanel({
      title: 'Remove from Project',
      message: `Remove ${name} from this project? They won't be able to see this board.`,
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          setRemoving(userId)
          setPanelError(null)
          await api.delete(
            `/organizations/${orgId}/projects/${projectId}/members/${userId}`
          )
          onMembersUpdated()
        } catch (err) {
          setPanelError(err.response?.data?.message || 'Failed to remove member')
        } finally {
          setRemoving(null)
        }
      }
    })
  }

  return (
    <div className={`fixed right-0 top-0 h-full
      w-[340px] flex flex-col z-50
      shadow-[-8px_0_32px_rgba(0,0,0,0.2)]
      ${isDark
        ? 'bg-[#141414] border-l border-[rgba(255,255,255,0.07)]'
        : 'bg-white border-l border-slate-200'
      }`}>

      <div className={`h-12 flex items-center
        justify-between px-4 border-b shrink-0
        ${isDark
          ? 'border-[rgba(255,255,255,0.06)]'
          : 'border-slate-200'
        }`}>
        <h3 className={`text-sm font-semibold
          ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Project Members
        </h3>
        <button onClick={onClose}
          className={`p-1.5 rounded-md transition-colors
            ${isDark
              ? 'text-slate-500 hover:text-slate-200 hover:bg-[rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}>
          <span className="material-symbols-outlined
                           text-[18px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto
                      custom-scrollbar p-4 space-y-6">

        {panelError && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2
            ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                     : 'bg-red-50 text-red-600 border border-red-100'}`}>
            <span className="material-symbols-outlined text-[16px]">error</span>
            {panelError}
          </div>
        )}

        <div>
          <p className={`text-[10px] font-bold uppercase
            tracking-widest mb-3
            ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            On this project ({projectMembers.length})
          </p>
          <div className="space-y-1">
            {projectMembers.map(m => (
              <div key={m._id}
                className={`flex items-center gap-3
                  px-3 py-2.5 rounded-xl group
                  ${isDark
                    ? 'bg-[rgba(255,255,255,0.03)]'
                    : 'bg-slate-50'
                  }`}>
                <div className="size-8 rounded-full
                  bg-indigo-500 text-white text-xs
                  font-bold flex items-center
                  justify-center overflow-hidden shrink-0">
                  {m.avatar
                    ? <img src={m.avatar}
                           className="w-full h-full
                                      object-cover" />
                    : m.name?.charAt(0)?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate
                    ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {m.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {m.email}
                  </p>
                </div>
                {getMemberRole(m._id) !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m._id, m.name)}
                    disabled={removing === m._id}
                    className="opacity-0 group-hover:opacity-100
                      p-1 rounded transition-all text-red-400
                      hover:bg-red-500/10 cursor-pointer">
                    <span className="material-symbols-outlined
                                     text-[16px]">
                      {removing === m._id
                        ? 'hourglass_empty' : 'person_remove'}
                    </span>
                  </button>
                )}
              </div>
            ))}
            {projectMembers.length === 0 && (
              <p className={`text-xs text-center py-4
                ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                No members yet
              </p>
            )}
          </div>
        </div>

        {availableToAdd.length > 0 && (
          <div>
            <p className={`text-[10px] font-bold uppercase
              tracking-widest mb-3
              ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Add from organization
            </p>
            <div className="space-y-1">
              {availableToAdd.map(m => {
                const userId = m.user?._id || m._id
                const name = m.user?.name || m.name || '?'
                const email = m.user?.email || m.email || ''
                const avatar = m.user?.avatar || m.avatar

                return (
                  <div key={userId}
                    className={`flex items-center gap-3
                      px-3 py-2.5 rounded-xl
                      ${isDark
                        ? 'hover:bg-[rgba(255,255,255,0.04)]'
                        : 'hover:bg-slate-50'
                      }`}>
                    <div className="size-8 rounded-full
                      bg-slate-500 text-white text-xs
                      font-bold flex items-center
                      justify-center overflow-hidden shrink-0">
                      {avatar
                        ? <img src={avatar}
                               className="w-full h-full
                                          object-cover" />
                        : name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium
                        truncate
                        ${isDark
                          ? 'text-slate-300'
                          : 'text-slate-700'
                        }`}>
                        {name}
                      </p>
                      <p className="text-xs text-slate-500
                                    truncate">
                        {email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(email, userId)}
                      disabled={adding === userId}
                      className="flex items-center gap-1
                        px-2.5 py-1 rounded-lg text-xs
                        font-semibold bg-indigo-600
                        hover:bg-indigo-700 text-white
                        disabled:opacity-50 transition-colors
                        shrink-0">
                      {adding === userId
                        ? <div className="size-3 rounded-full
                            border-2 border-white
                            border-t-transparent animate-spin" />
                        : <span className="material-symbols-outlined
                                           text-[14px]">add</span>
                      }
                      Add
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 border-t text-xs
        ${isDark
          ? 'border-[rgba(255,255,255,0.06)] text-slate-600'
          : 'border-slate-100 text-slate-400'
        }`}>
        Project members appear in task assignee dropdowns.
      </div>
    </div>
  )
}

function FilterPanel({
  isDark, filters, setFilters,
  members, onClose
}) {
  return (
    <div style={{
      position: 'fixed',
      top: '120px',
      right: '16px',
      width: '320px',
      maxHeight: 'calc(100vh - 140px)',
      overflowY: 'auto',
      background: isDark ? '#111827' : '#ffffff',
      border: `1px solid ${isDark
        ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      zIndex: 40,
      scrollbarWidth: 'thin',
      WebkitOverflowScrolling: 'touch',
    }}>

      {/* Header */}
      <div className={`flex items-center justify-between
        px-4 py-3 border-b
        ${isDark
          ? 'border-[rgba(255,255,255,0.06)]'
          : 'border-slate-100'
        }`}>
        <h3 className={`text-sm font-semibold
          ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Filter Tasks
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilters({
              assignee: '', priority: '',
              dueDateFrom: '', dueDateTo: '', label: '',
            })}
            className="text-xs text-indigo-500
              hover:underline cursor-pointer">
            Clear all
          </button>
          <button onClick={onClose}
            className={`p-1 rounded cursor-pointer
              ${isDark
                ? 'text-slate-500 hover:text-slate-300'
                : 'text-slate-400 hover:text-slate-700'
              }`}>
            <span className="material-symbols-outlined
                             text-[16px]">close</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Priority filter */}
        <div>
          <label className={`text-xs font-semibold
            uppercase tracking-wider block mb-2
            ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Priority
          </label>
          <div className="flex flex-wrap gap-2">
            {['', 'urgent', 'high', 'medium', 'low']
              .map(p => {
                const isActive = filters.priority === p
                return (
                  <button
                    key={p || 'all'}
                    onClick={() => {
                      setFilters(f => ({ ...f, priority: p }))
                      // Simple priority filter usually auto-closes if people want
                      // but we'll leave it for now or add onClose() if requested.
                      // The user said: "when selecting priority, it should call onClose()"
                      onClose()
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all
                      ${isActive
                        ? 'bg-indigo-600 text-white'
                        : isDark
                          ? 'bg-white/5 text-slate-500 hover:bg-white/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {p || 'All'}
                  </button>
                )
              })}
          </div>
        </div>

        {/* Assignee filter */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-2
            ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Assignee
          </label>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            <button
              onClick={() => {
                setFilters(f => ({ ...f, assignee: '' }))
                onClose()
              }}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-xs transition-all
                ${!filters.assignee 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              All Members
            </button>
            {members.map(m => {
              const id = m._id || m.user?._id
              const name = m.name || m.user?.name
              const isActive = filters.assignee === id
              return (
                <button
                  key={id}
                  onClick={() => {
                    setFilters(f => ({ ...f, assignee: id }))
                    onClose()
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  <div className={`size-5 rounded-full flex items-center justify-center text-[8px] font-bold
                    ${isActive ? 'bg-white/20' : 'bg-indigo-500 text-white'}`}>
                    {name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Label Search */}
        <div>
          <label className={`text-xs font-semibold uppercase tracking-wider block mb-2
            ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Label
          </label>
          <input
            type="text"
            placeholder="Filter by label..."
            value={filters.label}
            onChange={e => setFilters(f => ({ ...f, label: e.target.value }))}
            className={`w-full px-3 py-2 rounded-lg text-xs outline-none border
              ${isDark 
                ? 'bg-white/5 border-white/10 text-slate-300' 
                : 'bg-slate-50 border-slate-200 text-slate-700'}`}
          />
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all"
          >
            Apply & Close
          </button>
          <button
            onClick={() => {
              setFilters({
                assignee: '', priority: '',
                dueDateFrom: '', dueDateTo: '', label: '',
              })
              onClose()
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all
              ${isDark 
                ? 'border-white/10 text-slate-400 hover:bg-white/5' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BoardPage() {
  const { orgId, projectId } = useParams()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [board, setBoard] = useState(null)
  const [project, setProject] = useState(null)
  const [columns, setColumns] = useState([])
  const [tasksByColumn, setTasksByColumn] = useState({})
  const [members, setMembers] = useState([])
  const [orgMembers, setOrgMembers] = useState([])

  const currentUserMembership = orgMembers.find(m => m.user?._id === user?._id || m.user === user?._id)
  const userRole = currentUserMembership?.role || 'viewer'
  const perms = getPermissions(userRole)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [targetColumnId, setTargetColumnId] = useState(null)
  const [taskAttachments, setTaskAttachments] = useState({})

  const [showAddColumnModal, setShowAddColumnModal] =
    useState(false)
  const [newColumnName, setNewColumnName] =
    useState('')
  const [columnNameError, setColumnNameError] =
    useState('')
  const [addingColumn, setAddingColumn] =
    useState(false)
  const [showMembersPanel, setShowMembersPanel] =
    useState(false)
  const [showFilterPanel, setShowFilterPanel] =
    useState(false)
  const [filters, setFilters] = useState({
    assignee: '',
    priority: '',
    dueDateFrom: '',
    dueDateTo: '',
    label: '',
  })
  const [activeFilterCount, setActiveFilterCount] =
    useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const filterPanelRef = useRef(null)
  const deletingRef = useRef(new Set())

  useEffect(() => {
    const count = Object.values(filters).filter(Boolean).length
    setActiveFilterCount(count)
  }, [filters])
  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])
  const socketRef = useRef()

  const sensors = useSensors(
    // Mouse — desktop
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // Touch — mobile (requires 250ms hold)
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    // Pointer — stylus/hybrid devices
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const showConfirm = useCallback(({
    title, message, confirmText,
    confirmColor, onConfirm, narrow
  }) => {
    setConfirmModal({
      title, message, confirmText,
      confirmColor, onConfirm, narrow
    })
  }, [])

  const colWidth = React.useMemo(() => {
    const count = columns.length
    if (count === 0) return '280px'
    const available = window.innerWidth - 240 - (count + 1) * 12 - 32
    const w = Math.floor(available / count)
    return `${Math.max(220, Math.min(w, 340))}px`
  }, [columns.length])

  const totalTasks = React.useMemo(() => {
    return Object.values(tasksByColumn).flat().length
  }, [tasksByColumn])

  const getFilteredTasks = useCallback((colId) => {
    const tasks = tasksByColumn[colId] || []
    return tasks.filter(t => {
      // Search filter
      const q = (searchQuery || '').toLowerCase().trim()
      const matchSearch = !q ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.labels?.some(l =>
          l.toLowerCase().includes(q)
        )

      // Priority filter
      const matchPriority = !filters.priority ||
        t.priority === filters.priority

      // Assignee filter
      const matchAssignee = !filters.assignee ||
        t.assignees?.some(a =>
          (a._id || a) === filters.assignee
        )

      // Label filter
      const matchLabel = !filters.label ||
        t.labels?.some(l =>
          l.toLowerCase().includes(
            filters.label.toLowerCase()
          )
        )

      // Due date filters
      const matchDueFrom = !filters.dueDateFrom ||
        (t.dueDate &&
          new Date(t.dueDate) >=
          new Date(filters.dueDateFrom))

      const matchDueTo = !filters.dueDateTo ||
        (t.dueDate &&
          new Date(t.dueDate) <=
          new Date(filters.dueDateTo))

      return matchSearch && matchPriority &&
        matchAssignee && matchLabel &&
        matchDueFrom && matchDueTo
    })
  }, [tasksByColumn, searchQuery, filters])

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // CORRECT: /api/organizations/:orgId/projects/:id
      const projectRes = await api.get(
        `/organizations/${orgId}/projects/${projectId}`
      )

      const projectData =
        projectRes.data?.data?.project ||
        projectRes.data?.data ||
        projectRes.data

      const boardData = projectData?.board
      const cols = boardData?.columns || []

      setProject(projectData)
      setBoard(boardData)
      setColumns(cols)

      if (!boardData?._id) {
        setLoading(false)
        return
      }

      // CORRECT: /api/tasks?boardId=:boardId
      const tasksRes = await api.get(
        `/tasks?boardId=${boardData._id}`
      )
      const allTasks = tasksRes.data?.data?.tasks || []

      // Group by column
      const grouped = {}
      cols.forEach(col => { grouped[col._id] = [] })
      allTasks.forEach(task => {
        const colId = task.column?._id || task.column
        if (grouped[colId]) {
          grouped[colId].push(task)
        }
      })
      Object.keys(grouped).forEach(colId => {
        grouped[colId].sort((a, b) => a.order - b.order)
      })
      setTasksByColumn(grouped)

      // Fetch PROJECT members for task assignment
      // These are users added to this specific project
      const projMembersRes = await api.get(
        `/organizations/${orgId}/projects/${projectId}/members`
      ).catch(() => null)

      if (projMembersRes) {
        const projMembers =
          projMembersRes.data?.data?.members || []
        setMembers(projMembers)
      }

      // Fetch ALL org members for "Add to project" panel
      const orgMembersRes = await api.get(
        `/organizations/${orgId}/members`
      )
      setOrgMembers(orgMembersRes.data?.data?.members || [])

    } catch (err) {
      console.error('Board fetch error:', err)
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to load board'
      )
    } finally {
      setLoading(false)
    }
  }, [orgId, projectId])

  useEffect(() => {
    setLoading(true)
    setColumns([])
    setTasksByColumn({})
    if (orgId && projectId) {
      fetchBoard()
    }
  }, [orgId, projectId, fetchBoard])

  // Socket.io integration
  useEffect(() => {
    if (!board?._id) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL ||
                     'http://localhost:5000'
    const socket = io(socketUrl, { withCredentials: true })
    socketRef.current = socket

    socket.emit('join:board', { boardId: board._id })

    socket.on('task:moved', () => {
      fetchBoard()
    })

    socket.on('task:created', ({ task }) => {
      const colId = task.column?._id || task.column
      setTasksByColumn(prev => {
        const colTasks = prev[colId] || []
        if (colTasks.some(t => t._id === task._id)) return prev
        return {
          ...prev,
          [colId]: [...colTasks, task]
        }
      })
    })

    socket.on('task:updated', ({ task }) => {
      const colId = task.column?._id || task.column
      setTasksByColumn(prev => ({
        ...prev,
        [colId]: (prev[colId] || []).map(t => t._id === task._id ? task : t)
      }))
      if (selectedTask?._id === task._id) setSelectedTask(task)
    })

    socket.on('task:deleted', ({ taskId }) => {
      setTasksByColumn(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(cid => {
          next[cid] = next[cid].filter(t => t._id !== taskId)
        })
        return next
      })
      if (selectedTask?._id === taskId) setSelectedTask(null)
    })

    return () => {
      socket.emit('leave:board', { boardId: board._id })
      socket.disconnect()
    }
  }, [board?._id, selectedTask?._id, fetchBoard])

  // DnD Handlers
  const handleDragStart = (event) => {
    const { active } = event
    const task = Object.values(tasksByColumn).flat().find(t => t._id === active.id)
    setActiveTask(task)
  }

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over || !active) return
    if (active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Find source column of active task
    let sourceColId = null
    for (const [colId, tasks] of
         Object.entries(tasksByColumn)) {
      if (tasks.some(t => String(t._id) === activeId)) {
        sourceColId = colId
        break
      }
    }
    if (!sourceColId) return

    // Determine target column
    // over.id could be a column id or a task id
    let targetColId = null

    // Check if over is a column directly
    if (columns.some(c => String(c._id) === overId)) {
      targetColId = overId
    } else {
      // over is a task — find its column
      for (const [colId, tasks] of
           Object.entries(tasksByColumn)) {
        if (tasks.some(t => String(t._id) === overId)) {
          targetColId = colId
          break
        }
      }
    }

    if (!targetColId || sourceColId === targetColId) return

    setTasksByColumn(prev => {
      const next = { ...prev }
      const sourceTask = next[sourceColId]
        ?.find(t => String(t._id) === activeId)
      if (!sourceTask) return prev

      next[sourceColId] = next[sourceColId]
        .filter(t => String(t._id) !== activeId)
      next[targetColId] = [
        ...(next[targetColId] || []),
        { ...sourceTask, column: targetColId }
      ]
      return next
    })
  }, [tasksByColumn, columns])

  const handleAddColumn = () => {
    setShowAddColumnModal(true)
    setNewColumnName('')
  }

  const handleAddColumnSubmit = async () => {
    if (!newColumnName.trim()) return

    // Check for duplicate name
    const duplicate = columns.find(
      c => c.name.toLowerCase().trim() ===
           newColumnName.toLowerCase().trim()
    )
    if (duplicate) {
      // Show error in the modal
      setColumnNameError(
        `A column named "${newColumnName.trim()}" ` +
        `already exists in this board.`
      )
      return
    }

    setAddingColumn(true)
    setColumnNameError('')
    try {
      const res = await api.post(
        `/boards/${board._id}/columns`,
        { name: newColumnName.trim() }
      )
      const newCol = res.data?.data?.column
      if (newCol) {
        setColumns(prev => [...prev, newCol])
        setTasksByColumn(prev => ({
          ...prev, [newCol._id]: []
        }))
      }
      setShowAddColumnModal(false)
      setNewColumnName('')
      showToast('Column added!', 'success')
    } catch (err) {
      showToast(
        err.response?.data?.message ||
        'Failed to add column', 'error'
      )
    } finally {
      setAddingColumn(false)
    }
  }

  const handleDeleteColumn = async (columnId) => {
    showConfirm({
      title: 'Delete Column',
      message: 'Delete this column and all its tasks? Cannot be undone.',
      confirmText: 'Delete Column',
      confirmColor: 'red',
      narrow: true,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await api.delete(`/columns/${columnId}`)
          setColumns(prev => prev.filter(c => c._id !== columnId))
          setTasksByColumn(prev => {
            const next = { ...prev }
            delete next[columnId]
            return next
          })
        } catch (err) {
          console.error('Col delete error:', err)
        }
      }
    })
  }

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !active) return

    const activeId = String(active.id)
    const overId = String(over.id)

    let sourceColumnId = null
    let targetColumnId = null

    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      if (tasks.some(t => String(t._id) === activeId)) {
        sourceColumnId = colId
      }
    }

    if (columns.some(c => String(c._id) === overId)) {
      targetColumnId = overId
    } else {
      for (const [colId, tasks] of Object.entries(tasksByColumn)) {
        if (tasks.some(t => String(t._id) === overId)) {
          targetColumnId = colId
          break
        }
      }
    }

    if (!sourceColumnId || !targetColumnId) return

    const sourceTasks = tasksByColumn[sourceColumnId] || []
    const taskToMove = sourceTasks.find(
      t => String(t._id) === activeId
    )
    if (!taskToMove) return

    const prevSnapshot = JSON.parse(JSON.stringify(tasksByColumn))

    let newOrder = 0
    const targetTasks = tasksByColumn[targetColumnId] || []

    if (sourceColumnId === targetColumnId) {
      const isOverTask = targetTasks.some(
        t => String(t._id) === overId
      )
      if (isOverTask && activeId !== overId) {
        const oldIdx = targetTasks.findIndex(
          t => String(t._id) === activeId
        )
        newOrder = targetTasks.findIndex(
          t => String(t._id) === overId
        )
        if (oldIdx !== -1 && newOrder !== -1 &&
            oldIdx !== newOrder) {
          const reordered = arrayMove(
            targetTasks, oldIdx, newOrder
          )
          setTasksByColumn(prev => ({
            ...prev,
            [targetColumnId]: reordered,
          }))
        } else {
          newOrder = oldIdx !== -1 ? oldIdx : 0
        }
      } else {
        newOrder = targetTasks.findIndex(
          t => String(t._id) === activeId
        )
        if (newOrder === -1) newOrder = 0
      }
    } else {
      if (targetTasks.some(t => String(t._id) === overId)) {
        newOrder = targetTasks.findIndex(
          t => String(t._id) === overId
        )
      } else {
        newOrder = targetTasks.filter(
          t => String(t._id) !== activeId
        ).length
      }

      setTasksByColumn(prev => {
        const newState = { ...prev }
        newState[sourceColumnId] = newState[sourceColumnId].filter(
          t => String(t._id) !== activeId
        )
        const dest = [
          ...(newState[targetColumnId] || []).filter(
            t => String(t._id) !== activeId
          ),
        ]
        dest.splice(newOrder, 0, {
          ...taskToMove,
          column: targetColumnId,
        })
        newState[targetColumnId] = dest
        return newState
      })
    }

    try {
      await api.patch(`/tasks/${activeId}/move`, {
        newColumnId: targetColumnId,
        newOrder,
      })
    } catch (err) {
      console.error('Move task error:', err)
      setTasksByColumn(prevSnapshot)
      showToast('Failed to move task', 'error')
      fetchBoard()
    }
  }, [tasksByColumn, columns, fetchBoard, showToast])

  const handleTaskCreated = useCallback(
    (newTask) => {
      if (!newTask) return
      setTasksByColumn(prev => {
        const colId = String(
          newTask.column?._id || newTask.column
        )
        const existing = prev[colId] || []
        // Dedup check
        if (existing.some(
          t => t._id === newTask._id
        )) return prev
        return {
          ...prev,
          [colId]: [...existing, newTask]
        }
      })
      setShowCreateModal(false)
    },
    []
  )

  const handleTaskUpdated = useCallback(
    (updatedTask) => {
      if (!updatedTask?._id) return

      setTasksByColumn(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(colId => {
          next[colId] = (next[colId] || []).map(t =>
            String(t._id) === String(updatedTask._id)
              ? { ...t, ...updatedTask }
              : t
          )
        })
        return next
      })

      // CRITICAL: Update selectedTask so panel shows
      // fresh data after priority/status/etc change
      setSelectedTask(prev => {
        if (!prev) return prev
        if (String(prev._id) ===
            String(updatedTask._id)) {
          return { ...prev, ...updatedTask }
        }
        return prev
      })
    },
    []
  )

  const handleDeleteTask = useCallback(async (taskId) => {
    if (deletingRef.current.has(taskId)) return
    deletingRef.current.add(taskId)

    // Close modal immediately before API call
    setConfirmModal(null)

    try {
      await api.delete(`/tasks/${taskId}`)

      // Update state after successful delete
      setTasksByColumn(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(colId => {
          next[colId] = next[colId].filter(
            t => t._id !== taskId
          )
        })
        return next
      })
      setSelectedTask(prev =>
        prev?._id === taskId ? null : prev
      )
      showToast('Task deleted.', 'success')
    } catch (err) {
      console.error('Delete task error:', err)
      showToast(
        err.response?.data?.message ||
        'Failed to delete task',
        'error'
      )
      // Refetch to restore correct state
      fetchBoard()
    } finally {
      deletingRef.current.delete(taskId)
    }
  }, [showToast, fetchBoard])

  if (loading) return (
    <div className={`flex-1 overflow-x-auto overflow-y-hidden ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f4f5f7]'}`} style={{ height: 'calc(100vh - 64px)' }}>
      <div style={{
        display: 'flex', gap: '16px', padding: '20px'
      }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            width: '280px', flexShrink: 0
          }}>
            {/* Column header skeleton */}
            <div className="skeleton" style={{
              height: '36px',
              marginBottom: '12px',
            }} />
            {/* Task card skeletons */}
            {[1,2,3].map(j => (
              <div key={j} className="skeleton"
                style={{
                  height: `${60 + j * 12}px`,
                  marginBottom: '8px',
                }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-red-500 text-[32px]">error</span>
      </div>
      <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Failed to load board</h2>
      <p className="text-slate-500 max-w-sm mb-6">{error}</p>
      <button onClick={() => fetchBoard()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
        Try Again
      </button>
    </div>
  )

  return (
    <div
      className={`flex flex-col overflow-hidden
        ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f4f5f7]'}`}
      style={{ height: 'calc(100vh - 64px)' }}
    >

      {showMembersPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowMembersPanel(false)}
          />
          <ProjectMembersPanel
            isDark={isDark}
            projectId={projectId}
            orgId={orgId}
            projectMembers={members}
            orgMembers={orgMembers}
            onClose={() => setShowMembersPanel(false)}
            onMembersUpdated={() => {
              fetchBoard()
              setShowMembersPanel(false)
            }}
            showConfirmInPanel={showConfirm}
            showToastInPanel={showToast}
          />
        </>
      )}

      {/* Board Header — mobile safe layout */}
      <div className={`px-4 py-3 flex items-center
        justify-between gap-3 border-b shrink-0
        ${isDark
          ? 'bg-[#0f0f0f] border-[rgba(255,255,255,0.06)]'
          : 'bg-white border-slate-200'
        }`}
        style={{
          flexWrap: 'nowrap',
          overflowX: 'auto',
        }}>
        <div className="flex items-center gap-3"
          style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <button
            onClick={() => navigate('/projects')}
            className={`p-1.5 rounded-lg transition-colors
              ${isDark
                ? 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
          >
            <span className="material-symbols-outlined
                             text-[20px]">
              arrow_back
            </span>
          </button>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1 className={`text-lg font-bold
              ${isDark ? 'text-white' : 'text-slate-900'}`}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
              {board?.name || project?.name || 'Project Board'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {members.length} members • {totalTasks} tasks
            </p>
          </div>
        </div>

        {/* Action buttons — shrink on mobile */}
        <div className="flex items-center gap-2"
          style={{ flexShrink: 0 }}>
          <div className="relative">
            <button
              onClick={() => setShowFilterPanel(p => !p)}
              className={`h-7 px-2.5 rounded-md text-xs
                flex items-center gap-1.5 font-medium
                transition-colors cursor-pointer
                ${activeFilterCount > 0
                  ? 'bg-indigo-600 text-white'
                  : isDark
                    ? 'bg-[rgba(255,255,255,0.05)] text-slate-400 hover:bg-[rgba(255,255,255,0.08)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
              <span className="material-symbols-outlined
                               text-[14px]">tune</span>
              <span className="hide-on-mobile">Filter</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-indigo-600
                  rounded-full size-4 text-[10px] font-bold
                  flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilterPanel && (
              <FilterPanel
                isDark={isDark}
                filters={filters}
                setFilters={setFilters}
                members={members}
                onClose={() => setShowFilterPanel(false)}
              />
            )}
          </div>

          <button
            onClick={() => setShowMembersPanel(p => !p)}
            className={`flex items-center gap-1.5 px-3
              py-1.5 rounded-lg text-xs font-medium
              transition-colors hide-on-mobile
              ${isDark
                ? 'border border-[rgba(255,255,255,0.08)] text-slate-400 hover:bg-[rgba(255,255,255,0.06)]'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              group
            </span>
            Members
          </button>
          <div className="relative hide-on-mobile">
            <span className="material-symbols-outlined
                             absolute left-3 top-1/2 -translate-y-1/2
                             text-[16px] text-slate-500">
              search
            </span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-1.5 rounded-lg border-none
                text-sm w-48 transition-all focus:w-64
                ${isDark
                  ? 'bg-[rgba(255,255,255,0.05)] text-white focus:bg-[rgba(255,255,255,0.08)]'
                  : 'bg-slate-100 text-slate-900 focus:bg-slate-200/50'
                }`}
            />
          </div>

          {/* New Task — ALWAYS fully visible */}
          <button
            onClick={() => {
              setTargetColumnId(columns[0]?._id)
              setShowCreateModal(true)
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            <span className="material-symbols-outlined"
              style={{ fontSize: '16px' }}>
              add
            </span>
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Board Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={`board-scroll-container flex-1 overflow-x-auto overflow-y-visible
          ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f4f5f7]'}`}
          style={{
            height: 'calc(100vh - 160px)',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            scrollPaddingLeft: '16px',
          }}>
          <div className="flex gap-3 h-full px-4 pb-4 pt-3"
               style={{
                 minWidth: 'max-content',
                 alignItems: 'flex-start',
               }}>
            {columns.map(column => (
              <BoardColumn
                key={column._id}
                column={column}
                tasks={getFilteredTasks(column._id)}
                isDark={isDark}
                width={colWidth}
                onTaskClick={setSelectedTask}
                onAddTask={(cid) => {
                  setTargetColumnId(cid)
                  setShowCreateModal(true)
                }}
                onDeleteColumn={handleDeleteColumn}
                onDeleteTask={handleDeleteTask}
                showConfirm={showConfirm}
                canDeleteColumn={perms.canDeleteColumn}
                perms={perms}
              />
            ))}

            {/* Add Column Button */}
            {perms.canCreateColumn && (
              <div className="shrink-0" style={{ minWidth: '200px', flexShrink: 0 }}>
                <button
                  onClick={handleAddColumn}
                  className={`w-full h-12 rounded-xl border border-dashed
                    flex items-center justify-center gap-2 transition-all
                    ${isDark
                      ? 'border-[rgba(255,255,255,0.08)] text-slate-500 hover:bg-white/5 hover:border-slate-700'
                      : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span className="text-sm font-semibold">Add Column</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px] rotate-3 cursor-grabbing">
              <TaskCard
                task={activeTask}
                isDark={isDark}
                onClick={() => {}}
                isDragging
                showConfirm={showConfirm}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals & Panels */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-all"
            />
            <TaskDetailPanel
              key="task-detail-panel"
              task={selectedTask}
              columns={columns}
              tasksByColumn={tasksByColumn}
              members={members}
              orgMembers={orgMembers}
              isDark={isDark}
              onClose={() => setSelectedTask(null)}
              onUpdate={handleTaskUpdated}
              onDelete={handleDeleteTask}
              showConfirm={showConfirm}
              showToast={showToast}
              canDelete={perms.canDeleteTask}
              canUpdate={perms.canUpdateTask}
              canAssign={perms.canAssignTask}
              attachments={
                taskAttachments[selectedTask?._id] || []
              }
              onAttachmentsChange={(taskId, files) => {
                setTaskAttachments(prev => ({
                  ...prev, [taskId]: files
                }))
              }}
            />
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && board && (
          <CreateTaskModal
            key="create-task-modal"
            boardId={board?._id}
            columns={columns}
            members={members}
            isDark={isDark}
            onClose={() => {
              setShowCreateModal(false)
              setTargetColumnId(null)
            }}
            onTaskCreated={handleTaskCreated}
            createInColumn={targetColumnId || columns[0]?._id}
            tasksByColumn={tasksByColumn}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal
            key="confirm-modal"
            isDark={isDark}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            confirmColor={confirmModal.confirmColor}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
            narrow={confirmModal.narrow}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast
            key="toast-alert"
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {showAddColumnModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={() => setShowAddColumnModal(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '400px',
            background: isDark ? '#111827' : '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: `1px solid ${isDark
              ? 'rgba(255,255,255,0.08)'
              : '#e2e8f0'}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
          onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#0f172a',
              marginBottom: '6px',
            }}>
              Add Column
            </h3>
            <p style={{
              fontSize: '13px',
              color: isDark ? '#64748b' : '#94a3b8',
              marginBottom: '16px',
            }}>
              Give your new column a name
            </p>
            {columnNameError && (
              <p style={{
                fontSize: '12px',
                color: '#ef4444',
                marginBottom: '10px',
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                ⚠ {columnNameError}
              </p>
            )}
            <input
              autoFocus
              type="text"
              placeholder="e.g. Backlog, Testing, Deployed..."
              value={newColumnName}
              onChange={e => {
                setNewColumnName(e.target.value)
                setColumnNameError('')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddColumnSubmit()
                if (e.key === 'Escape') setShowAddColumnModal(false)
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: `1px solid ${isDark
                  ? 'rgba(255,255,255,0.12)'
                  : '#e2e8f0'}`,
                background: isDark ? '#1e293b' : '#f8fafc',
                color: isDark ? '#f1f5f9' : '#0f172a',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => setShowAddColumnModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark
                    ? 'rgba(255,255,255,0.1)'
                    : '#e2e8f0'}`,
                  background: 'transparent',
                  color: isDark ? '#64748b' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddColumnSubmit}
                disabled={addingColumn ||
                  !newColumnName.trim()}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: addingColumn
                    ? 'not-allowed' : 'pointer',
                  opacity: addingColumn ? 0.7 : 1,
                }}>
                {addingColumn ? 'Adding...' : 'Add Column'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






