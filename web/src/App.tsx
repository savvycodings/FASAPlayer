import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { DashboardPage } from '@/pages/Dashboard'
import { SetsPage } from '@/pages/Sets'
import { SetDetailPage } from '@/pages/SetDetail'
import { CardDetailPage } from '@/pages/CardDetail'
import { JobsPage, JobDetailPage } from '@/pages/Jobs'
import { VizPage } from '@/pages/Viz'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sets" element={<SetsPage />} />
          <Route path="sets/:setId" element={<SetDetailPage />} />
          <Route path="cards/:cardId" element={<CardDetailPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:jobId" element={<JobDetailPage />} />
          <Route path="viz" element={<VizPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
