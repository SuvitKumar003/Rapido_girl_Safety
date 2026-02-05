import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LiveMap from './LiveMap';
import MobileApp from './MobileApp';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LiveMap />} />
                <Route path="/app" element={<MobileApp />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
