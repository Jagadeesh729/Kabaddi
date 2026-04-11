import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertTriangle, Send, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { baseURL } from '../utils/constants';
import toast from 'react-hot-toast';

const ReportIssueModal = ({ matchId, isOpen, onClose }) => {
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState('');
    const [description, setDescription] = useState('');
    const [screenshot, setScreenshot] = useState(null); // Base64 string
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const user = localStorage.getItem('user'); // Basic user check, usually username or ID

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) {
            toast.error("Please select an issue category.");
            return;
        }
        if (!priority) {
            toast.error("Please select a priority level.");
            return;
        }
        if (!description.trim()) {
            toast.error("Please describe the issue.");
            return;
        }

        setLoading(true);
        try {
            let actualUserId = user;
            let actualReporterName = user;

            if (!actualUserId) {
                let guestId = localStorage.getItem('guestDeviceId');
                if (!guestId) {
                    guestId = crypto.randomUUID();
                    localStorage.setItem('guestDeviceId', guestId);
                }
                actualUserId = guestId;
                actualReporterName = `Guest-${guestId.substring(0, 4).toUpperCase()}`;
            }

            const payload = {
                matchId: matchId,
                reporterName: actualReporterName,
                reporterId: actualUserId,
                category: category,
                priority: priority,
                description: description,
                screenshot: screenshot
            };

            await axios.post(`${baseURL}/issues/report/${matchId}`, payload);

            toast.success("Issue reported successfully!");
            setCategory('');
            setPriority('');
            setDescription('');
            setScreenshot(null);
            setPreviewUrl(null);
            onClose();
        } catch (error) {
            console.error("Failed to report issue:", error);
            const errorMessage = error.response?.data || "Failed to submit report. Please try again.";
            toast.error(typeof errorMessage === 'string' ? errorMessage : "Failed to submit report.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast.error("Image size should be less than 2MB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshot(reader.result);
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setScreenshot(null);
        setPreviewUrl(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <h3 className="text-white font-bold text-lg">Report Issue</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Guest User Tip */}
                {!user && (
                    <div className="bg-orange-500/10 px-6 py-2 border-b border-orange-500/20">
                        <p className="text-[10px] text-orange-300 font-medium leading-tight">
                            Reporting as Guest. You can track this report using the "Guest Reports" button on the scoreboard.
                        </p>
                    </div>
                )}

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Match ID
                        </label>
                        <input
                            type="text"
                            value={matchId}
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Issue Category <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500/50"
                            required
                        >
                            <option value="" disabled className="text-gray-500">Select Category</option>
                            <option value="Score Error" className="text-black">Score Error</option>
                            <option value="Player Stats Error" className="text-black">Player Stats Error</option>
                            <option value="Commentary Error" className="text-black">Commentary Error</option>
                            <option value="Technical Bug" className="text-black">Technical Bug</option>
                            <option value="Other" className="text-black">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Priority <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-4">
                            {['High', 'Medium', 'Low'].map(level => (
                                <label key={level} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value={level}
                                        checked={priority === level}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio text-red-500 bg-white/5 border-white/10 focus:ring-red-500"
                                        required
                                    />
                                    <span className="text-sm text-gray-300">{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Describe the Issue <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Example: Incorrect score, wrong player name, video lag..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 min-h-[120px] resize-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Screenshot (Optional)
                        </label>

                        {!previewUrl ? (
                            <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:border-red-500/50 transition-colors bg-white/5">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="screenshot-upload"
                                />
                                <label htmlFor="screenshot-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-400">Click to upload image</span>
                                    <span className="text-xs text-gray-500">Max 2MB</span>
                                </label>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-white/20 bg-black/20">
                                <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Submit Report
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};

export default ReportIssueModal;
