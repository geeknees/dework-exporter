<script setup>
import { ref, onMounted, computed } from 'vue'
import { useGetDeworkData } from '../composables/getdeworkdata'
import { useGetWorkspaceSlug } from '../composables/getworkspaceslug'
import { useGetWorkspaceTasks } from '../composables/getworkspacetasks'
import { useGetOrganizationDetails } from '../composables/getOrganizationDetails'
import { onBeforeUnmount } from 'vue'

const orgHenkaku = '76279e67-ee71-4168-ac45-f32da09584c1'

const loaded = ref(false)
let isCancelled = ref(false)

let henkaku = ref({})
henkaku.value = await useGetOrganizationDetails(orgHenkaku)
console.log(henkaku.value)

let henkakuWorkspaces = {}
let lastRefresh = 0
let henkakuSlug = ref()

onMounted(async () => {
  await getDework()
})

onBeforeUnmount(() => {
  isCancelled.value = true
})

function updateObjectWithSlugs(object, slugs) {
  slugs.data.getOrganization.workspaces.forEach((workspace) => {
    Object.keys(object).forEach((key) => {
      if (object[key].id === workspace.id) {
        object[key].name = workspace.name
        object[key].slug = workspace.slug
      }
    })
  })
}

async function gethenkakuWorkspaces() {
  if (isCancelled.value) return

  const tasksPromises = Object.keys(henkaku.value).map((key) => {
    return useGetDeworkData(henkaku.value[key].id).then((tasks) => {
      return { key, tasks: tasks.data.getWorkspace.tasks }
    })
  })

  const results = await Promise.all(tasksPromises)
  results.forEach(({ key, tasks }) => {
    henkaku.value[key].tasks = tasks
  })
}

async function getDework() {
  loaded.value = false
  localStorage.removeItem('henkakuWorkspaces')
  const henkakuSlugs = await useGetWorkspaceSlug(orgHenkaku)
  henkakuSlug.value = henkakuSlugs.data.getOrganization
  updateObjectWithSlugs(henkaku.value, henkakuSlugs)
  localStorage.setItem('henkakuWorkspaces', JSON.stringify(henkaku.value))
  await getTasks()
  loaded.value = true
}

async function getTasks() {
  // Initiate both tasks simultaneously and wait for both to complete
  await Promise.all([gethenkakuWorkspaces()])

  // Once both tasks are complete, update localStorage
  localStorage.setItem('henkakuWorkspaces', JSON.stringify(henkaku.value))
}

function countAuditedTasks(tasks) {
  const auditedRegex = /\baudited\b/i
  const fundRequestRegex = /(?=.*\bfund\b)(?=.*\brequest\b).*/i

  return tasks.filter((task) => {
    return task.tags.some(
      (tag) => auditedRegex.test(tag.label) || fundRequestRegex.test(tag.label)
    )
  }).length
}

function countNonAuditedTasks(tasks) {
  const auditedRegex = /\baudited\b/i
  const fundRequestRegex = /(?=.*\bfund\b)(?=.*\brequest\b).*/i

  return tasks.filter((task) => {
    return !task.tags.some(
      (tag) => auditedRegex.test(tag.label) || fundRequestRegex.test(tag.label)
    )
  }).length
}

const isAuditedTasksLoaded = (workspace) => {
  return countAuditedTasks(workspace.tasks) > 0
}
function hasNonAuditedTasks(workspace) {
  return countNonAuditedTasks(workspace.tasks) > 0
}
const isWorkspaceReady = computed(() => {
  return (workspace) => {
    return !hasNonAuditedTasks(workspace)
  }
})

function openLink(id) {
  let workspaceSlug = ''
  let organizationSlug = ''
  for (let i in henkakuSlug.value.workspaces) {
    if (henkakuSlug.value.workspaces[i].id == id) {
      organizationSlug = henkakuSlug.value.slug
      workspaceSlug = henkakuSlug.value.workspaces[i].slug
    }
  }

  window.open(
    `https://app.dework.xyz/${organizationSlug}/${workspaceSlug}/view/board`,
    '_blank'
  )
}
function getChargeMonth(task) {
  // Format a date to "dd.mm.yy"
  const formatDate = (date) => {
    const d = new Date(date)
    return `${String(d.getDate()).padStart(2, '0')}.${String(
      d.getMonth() + 1
    ).padStart(2, '0')}.${String(d.getFullYear()).toString().substr(-2)}`
  }

  // Check if the auditLog is empty
  if (task.auditLog.length === 0) {
    return formatDate(task.createdAt)
  }

  // Look inside auditLog for a kind "E" with rhs of "IN_REVIEW", starting from the latest
  for (let i = task.auditLog.length - 1; i >= 0; i--) {
    const log = task.auditLog[i]
    if (log.diff && log.diff.length > 0) {
      const change = log.diff[0]
      if (change.kind === 'E' && change.rhs === 'IN_REVIEW') {
        //console.log("IN_REVIEW found", log.createdAt)
        return formatDate(log.createdAt)
      }
    }
  }

  // If no "IN_REVIEW" status is found, return the task's createdAt date
  return formatDate(task.createdAt)
}

async function exportData(id) {
  let workspaceSlug = ''
  let workspaceName = ''
  let organizationSlug = ''
  for (let i in henkakuSlug.value.workspaces) {
    if (henkakuSlug.value.workspaces[i].id == id) {
      organizationSlug = henkakuSlug.value.slug
      workspaceSlug = henkakuSlug.value.workspaces[i].slug
      workspaceName = henkakuSlug.value.workspaces[i].name
    }
  }

  const tasks = await useGetWorkspaceTasks(id)
  let csvContent =
    '"Name","Link","Tags","Story Points","Status","Assignees","Wallet Address","Reward","Due Date","Activities","Budget Month"\n'

  for (let task of tasks.data.getWorkspace.tasks) {
    //console.log("task", task)
    let name = task.name || ''
    let link = `https://app.dework.xyz/${organizationSlug}/${task.workspace.slug}?taskId=${task.id}`
    let tags = task.tags.map((t) => t.label).join(',') || ''
    let storyPoints = task.storyPoints || ''
    let status = task.status || ''
    let assignees = task.assignees.map((a) => a.username).join(',') || ''
    let walletAddress = ''
    let reward = ''
    let dueDate = task.dueDate || ''
    let creator =
      task.creator && task.creator.username
        ? task.creator.username
        : 'no-username'
    let createdAt = new Date(task.createdAt).toLocaleString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    let activities = `${creator} created on ${createdAt}`

    if (task.doneAt) {
      let doneAt = new Date(task.doneAt).toLocaleString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      activities += `, Task completed on ${doneAt}`
    }
    activities = activities.replace(/(\d{4}) at/g, '$1')
    let budgetMonth = getChargeMonth(task)
    //console.log("month",budgetMonth)
    csvContent += `"${name}","${link}","${tags}","${storyPoints}","${status}","${assignees}","${walletAddress}","${reward}","${dueDate}","${activities}","${budgetMonth}"\n`
  }
  //console.log(csvContent)

  // Convert the CSV content to a Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create a link element
  const link = document.createElement('a')

  // Add link to the body
  document.body.appendChild(link)

  // Set link attributes
  link.href = URL.createObjectURL(blob)
  link.type = 'text/csv'
  link.download = `${workspaceName}-tasks-list.csv`
  link.click()

  // Remove link after download
  setTimeout(() => {
    document.body.removeChild(link)
  }, 0)

  //console.log('Export data for workspace ID:', id, organizationSlug, workspaceSlug, tasks.data.getWorkspace.tasks);
}
</script>

<template>
  <div class="main">
    <div>
      <table>
        <thead>
          <tr>
            <th>Workspace</th>
            <th class="centered">Fund Request</th>
            <th class="centered">Not Fund Request</th>
            <th>Status</th>
            <!-- New column -->
            <th>Link</th>
            <th>Export</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            Henkaku
          </tr>
          <tr v-for="(workspace, key) in henkaku" :key="'henkaku-' + key">
            <td>{{ workspace.name }}</td>
            <td class="centered">{{ countAuditedTasks(workspace.tasks) }}</td>
            <td class="centered">
              {{ countNonAuditedTasks(workspace.tasks) }}
            </td>
            <td
              :class="{
                'green-text': isAuditedTasksLoaded(workspace),
                'red-text': !isWorkspaceReady(workspace)
              }"
            >
              {{ isWorkspaceReady(workspace) ? 'All Audited' : 'Not Audited' }}
            </td>
            <td><button @click="openLink(workspace.id)">Open Board</button></td>
            <td>
              <button @click="exportData(workspace.id)">Export csv</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.main {
  display: flex;
  justify-content: center; /* align horizontal */
  align-items: center; /* align vertical */
}

.centered {
  text-align: center;
}

table {
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ddd;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 12px; /* Adjust the font size as needed */
}

.green-text {
  color: green;
}
.red-text {
  color: red;
}
</style>
