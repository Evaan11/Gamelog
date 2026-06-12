import { Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Search } from './pages/Search'
import { Games } from './pages/Games'
import { GameDetail } from './pages/GameDetail'
import { ProfileLayout, ProfileRedirect } from './pages/profile/ProfileLayout'
import { ProfileOverview } from './pages/profile/ProfileOverview'
import { ProfileActivity } from './pages/profile/ProfileActivity'
import { ProfileGames } from './pages/profile/ProfileGames'
import { ProfileJournal } from './pages/profile/ProfileJournal'
import { ProfileReviews } from './pages/profile/ProfileReviews'
import { ProfileFriends } from './pages/profile/ProfileFriends'
import { ProfileLikes } from './pages/profile/ProfileLikes'
import { ProfileWishlist } from './pages/profile/ProfileWishlist'
import { ProfileLists } from './pages/profile/ProfileLists'
import { ListDetail } from './pages/ListDetail'
import { Settings } from './pages/Settings'
import { SteamCallback } from './pages/SteamCallback'
import { Legal } from './pages/Legal'
import { Footer } from './components/Footer'

function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/search" element={<Search />} />
          <Route path="/games" element={<Games />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/profile" element={<ProfileRedirect />} />
          <Route path="/u/:username" element={<ProfileLayout />}>
            <Route index element={<ProfileOverview />} />
            <Route path="activity" element={<ProfileActivity />} />
            <Route path="games" element={<ProfileGames />} />
            <Route path="journal" element={<ProfileJournal />} />
            <Route path="reviews" element={<ProfileReviews />} />
            <Route path="lists" element={<ProfileLists />} />
            <Route path="friends" element={<ProfileFriends />} />
            <Route path="likes" element={<ProfileLikes />} />
            <Route path="wishlist" element={<ProfileWishlist />} />
          </Route>
          <Route path="/list/:id" element={<ListDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/steam-callback" element={<SteamCallback />} />
          <Route path="/legal" element={<Legal />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
