import arch from './data/architecture.json'

const state = {
  data: arch,
  activeFlowId: null,
  selectedComponentId: null,
  filter: '',
}

const el = {
  title: document.getElementById('title'),
  subtitle: document.getElementById('subtitle'),
  portsHint: document.getElementById('ports-hint'),
  layers: document.getElementById('layers'),
  connections: document.getElementById('connections'),
  flowList: document.getElementById('flow-list'),
  detailPanel: document.getElementById('detail-panel'),
  detailTitle: document.getElementById('detail-title'),
  detailDesc: document.getElementById('detail-desc'),
  detailMeta: document.getElementById('detail-meta'),
  detailSteps: document.getElementById('detail-steps'),
  detailCache: document.getElementById('detail-cache'),
  filter: document.getElementById('filter'),
  btnReset: document.getElementById('btn-reset'),
}

const componentIndex = new Map()
arch.layers.forEach((layer) => {
  layer.components.forEach((c) => {
    componentIndex.set(c.id, { ...c, layerId: layer.id, layerName: layer.name })
  })
})

function init() {
  const { meta } = state.data
  el.title.textContent = meta.title
  el.subtitle.textContent = meta.subtitle
  if (meta.ports) {
    el.portsHint.textContent = `Expo :${meta.ports.expo} · Server :${meta.ports.server}`
  }
  renderLayers()
  renderFlows()
  bindEvents()
  requestAnimationFrame(drawConnections)
  window.addEventListener('resize', () => requestAnimationFrame(drawConnections))
}

function bindEvents() {
  el.filter.addEventListener('input', () => {
    state.filter = el.filter.value.trim().toLowerCase()
    renderLayers()
    requestAnimationFrame(drawConnections)
  })
  el.btnReset.addEventListener('click', () => {
    state.activeFlowId = null
    state.selectedComponentId = null
    el.detailPanel.hidden = true
    el.detailSteps.hidden = true
    el.detailCache.hidden = true
    document.querySelectorAll('.flow-list button').forEach((b) => b.classList.remove('active'))
    updateHighlights()
    requestAnimationFrame(drawConnections)
  })
}

function renderFlows() {
  el.flowList.innerHTML = ''
  state.data.flows.forEach((flow) => {
    const li = document.createElement('li')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.flowId = flow.id
    btn.innerHTML = `<span class="flow-name">${escapeHtml(flow.name)}</span><span class="flow-desc">${escapeHtml(flow.description)}</span>`
    btn.addEventListener('click', () => selectFlow(flow.id))
    li.appendChild(btn)
    el.flowList.appendChild(li)
  })
}

function selectFlow(flowId) {
  state.activeFlowId = flowId
  state.selectedComponentId = null
  document.querySelectorAll('.flow-list button').forEach((b) => {
    b.classList.toggle('active', b.dataset.flowId === flowId)
  })
  const flow = state.data.flows.find((f) => f.id === flowId)
  if (flow) {
    el.detailPanel.hidden = false
    el.detailTitle.textContent = flow.name
    el.detailDesc.textContent = flow.description
    el.detailMeta.innerHTML = ''
    const pathLabels = connectionLabelsForFlow(flow)
    if (pathLabels.length) {
      appendMeta('API path', pathLabels.join(' → '))
    }
    renderFlowSteps(flow)
    renderCacheLayers(flow)
  }
  updateHighlights()
  requestAnimationFrame(drawConnections)
}

function connectionLabelsForFlow(flow) {
  const ids = new Set(flow.connectionIds || [])
  return state.data.connections
    .filter((c) => ids.has(c.id) || (c.flowIds && c.flowIds.includes(flow.id)))
    .map((c) => c.label)
}

function appendMeta(label, value) {
  const dt = document.createElement('dt')
  dt.textContent = label
  const dd = document.createElement('dd')
  dd.textContent = value
  el.detailMeta.append(dt, dd)
}

function renderFlowSteps(flow) {
  el.detailSteps.innerHTML = ''
  if (!flow.steps?.length) {
    el.detailSteps.hidden = true
    return
  }
  el.detailSteps.hidden = false
  flow.steps.forEach((step) => {
    const li = document.createElement('li')
    const strong = document.createElement('strong')
    strong.textContent = step.title
    li.appendChild(strong)
    const span = document.createElement('span')
    span.textContent = step.detail
    li.appendChild(span)
    el.detailSteps.appendChild(li)
  })
}

function renderCacheLayers(flow) {
  el.detailCache.innerHTML = ''
  if (!flow.cacheLayers?.length) {
    el.detailCache.hidden = true
    return
  }
  el.detailCache.hidden = false
  const heading = document.createElement('h4')
  heading.textContent = 'What is cached vs recalled'
  el.detailCache.appendChild(heading)
  const table = document.createElement('table')
  table.className = 'cache-table'
  const thead = document.createElement('thead')
  thead.innerHTML = '<tr><th>Where</th><th>Stored</th><th>Recalled when</th></tr>'
  table.appendChild(thead)
  const tbody = document.createElement('tbody')
  flow.cacheLayers.forEach((row) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${escapeHtml(row.where)}</td><td>${escapeHtml(row.what)}<br><small>${escapeHtml(row.persist)}</small></td><td>${escapeHtml(row.recalled)}</td>`
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  el.detailCache.appendChild(table)
}

function renderLayers() {
  el.layers.innerHTML = ''
  state.data.layers.forEach((layer, index) => {
    if (index > 0) {
      const arrow = document.createElement('div')
      arrow.className = 'layer-arrow'
      arrow.setAttribute('aria-hidden', 'true')
      arrow.textContent = '↓'
      el.layers.appendChild(arrow)
    }

    const section = document.createElement('section')
    section.className = 'layer'
    section.dataset.layerId = layer.id

    const header = document.createElement('div')
    header.className = 'layer-header'
    header.innerHTML = `
      <span class="layer-badge" style="background:${layer.color}"></span>
      <h2 class="layer-name">${escapeHtml(layer.name)}</h2>
      <p class="layer-hint">${escapeHtml(layer.hint || '')}</p>
    `
    section.appendChild(header)

    const grid = document.createElement('div')
    grid.className = 'layer-components'

    const filtered = layer.components.filter(matchesFilter)
    filtered.forEach((comp) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'component'
      card.dataset.componentId = comp.id
      card.innerHTML = `
        <span class="component-kind">${escapeHtml(comp.kind)}</span>
        <span class="component-name">${escapeHtml(comp.name)}</span>
        <span class="component-path">${escapeHtml(comp.path)}</span>
        ${comp.summary ? `<span class="component-summary">${escapeHtml(comp.summary)}</span>` : ''}
      `
      card.addEventListener('click', (e) => {
        e.stopPropagation()
        selectComponent(comp.id)
      })
      grid.appendChild(card)
    })

    if (filtered.length === 0) {
      const empty = document.createElement('p')
      empty.style.cssText = 'padding:1rem;color:var(--muted);font-size:0.85rem;margin:0'
      empty.textContent = 'No components match filter'
      grid.appendChild(empty)
    }

    section.appendChild(grid)
    el.layers.appendChild(section)
  })
  updateHighlights()
}

function matchesFilter(comp) {
  if (!state.filter) return true
  const hay = `${comp.name} ${comp.path} ${comp.kind} ${comp.summary || ''}`.toLowerCase()
  return hay.includes(state.filter)
}

function selectComponent(id) {
  state.selectedComponentId = id
  const comp = componentIndex.get(id)
  if (comp) {
    el.detailPanel.hidden = false
    el.detailSteps.hidden = true
    el.detailCache.hidden = true
    el.detailTitle.textContent = comp.name
    el.detailDesc.textContent = comp.summary || ''
    el.detailMeta.innerHTML = ''
    appendMeta('Layer', comp.layerName)
    appendMeta('Path', comp.path)
    appendMeta('Kind', comp.kind)
    const related = state.data.connections.filter((c) => c.from === id || c.to === id)
    if (related.length) {
      appendMeta('Connections', related.map((c) => c.label).join('; '))
    }
  }
  updateHighlights()
  requestAnimationFrame(drawConnections)
}

function getActiveConnectionIds() {
  if (state.activeFlowId) {
    const flow = state.data.flows.find((f) => f.id === state.activeFlowId)
    const ids = new Set(flow?.connectionIds || [])
    state.data.connections.forEach((c) => {
      if (c.flowIds?.includes(state.activeFlowId)) ids.add(c.id)
    })
    return ids
  }
  if (state.selectedComponentId) {
    return new Set(
      state.data.connections
        .filter((c) => c.from === state.selectedComponentId || c.to === state.selectedComponentId)
        .map((c) => c.id)
    )
  }
  return new Set()
}

function getHighlightedComponentIds() {
  const ids = new Set()
  const connIds = getActiveConnectionIds()
  if (connIds.size === 0 && !state.selectedComponentId) return ids

  if (state.selectedComponentId) ids.add(state.selectedComponentId)

  state.data.connections.forEach((c) => {
    if (connIds.has(c.id)) {
      ids.add(c.from)
      ids.add(c.to)
    }
  })
  return ids
}

function updateHighlights() {
  const highlighted = getHighlightedComponentIds()
  const hasFocus = state.activeFlowId || state.selectedComponentId

  document.querySelectorAll('.component').forEach((card) => {
    const id = card.dataset.componentId
    card.classList.remove('highlight', 'dimmed', 'selected')
    if (state.selectedComponentId === id) card.classList.add('selected')
    if (!hasFocus) return
    if (highlighted.has(id)) card.classList.add('highlight')
    else card.classList.add('dimmed')
  })
}

function getCardCenter(id) {
  const card = document.querySelector(`.component[data-component-id="${id}"]`)
  const wrap = document.querySelector('.canvas-wrap')
  if (!card || !wrap) return null
  const cr = card.getBoundingClientRect()
  const wr = wrap.getBoundingClientRect()
  return {
    x: cr.left + cr.width / 2 - wr.left + wrap.scrollLeft,
    y: cr.top + cr.height / 2 - wr.top + wrap.scrollTop,
  }
}

function gradIdFor(connId) {
  return `grad-${String(connId).replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function createFlowGradient(defs, conn, from, to, active) {
  const id = gradIdFor(conn.id)
  const lg = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
  lg.setAttribute('id', id)
  lg.setAttribute('gradientUnits', 'userSpaceOnUse')
  lg.setAttribute('x1', String(from.x))
  lg.setAttribute('y1', String(from.y))
  lg.setAttribute('x2', String(to.x))
  lg.setAttribute('y2', String(to.y))

  const stops = active
    ? [
        { offset: '0%', color: '#0ea5e9', opacity: 0.15 },
        { offset: '35%', color: '#22d3ee', opacity: 1 },
        { offset: '65%', color: '#38bdf8', opacity: 1 },
        { offset: '100%', color: '#3b82f6', opacity: 0.25 },
      ]
    : [
        { offset: '0%', color: '#64748b', opacity: 0.05 },
        { offset: '50%', color: '#94a3b8', opacity: 0.35 },
        { offset: '100%', color: '#64748b', opacity: 0.05 },
      ]

  stops.forEach((s) => {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop.setAttribute('offset', s.offset)
    stop.setAttribute('stop-color', s.color)
    stop.setAttribute('stop-opacity', String(s.opacity))
    lg.appendChild(stop)
  })

  defs.appendChild(lg)
  return id
}

function appendPath(svg, d, className, strokeUrl, reverseFlow) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('class', className)
  if (strokeUrl) path.setAttribute('stroke', `url(#${strokeUrl})`)
  if (reverseFlow) path.classList.add('conn-flow-reverse')
  svg.appendChild(path)
  return path
}

function drawConnections() {
  const svg = el.connections
  const wrap = document.querySelector('.canvas-wrap')
  if (!wrap) return

  const w = wrap.scrollWidth
  const h = wrap.scrollHeight
  svg.setAttribute('width', w)
  svg.setAttribute('height', h)
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.innerHTML = ''

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)

  const activeIds = getActiveConnectionIds()
  const hasFocus = activeIds.size > 0

  state.data.connections.forEach((conn) => {
    const from = getCardCenter(conn.from)
    const to = getCardCenter(conn.to)
    if (!from || !to) return

    const midY = (from.y + to.y) / 2
    const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
    const isActive = hasFocus && activeIds.has(conn.id)
    const reverseFlow = to.y < from.y

    appendPath(svg, d, 'conn-track')

    const gradId = createFlowGradient(defs, conn, from, to, isActive)

    if (isActive) {
      appendPath(svg, d, 'conn-flow', gradId, reverseFlow)
    } else if (hasFocus) {
      appendPath(svg, d, 'conn-dim', gradId, false)
    } else {
      appendPath(svg, d, 'conn-idle', gradId, false)
    }
  })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

init()
