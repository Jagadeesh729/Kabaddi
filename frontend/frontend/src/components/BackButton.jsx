import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react'; // Assuming you use lucide-react for icons

const BackButton = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = React.useState(false);

  const handleGoBack = () => {
    setIsExiting(true);
    // Show the normal loader briefly when exiting
    setTimeout(() => {
      navigate(-1);
    }, 400);
  };

  return (
    <>
      {isExiting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        </div>
      )}
      <div
        onClick={handleGoBack}
        className="
        cursor-pointer
        inline-flex
        items-center
        px-4 py-2
        rounded-lg
        bg-gray-800         /* Dark gray background */
        text-gray-50         /* Light text color */
        shadow-lg
        transition-colors
        duration-300
        hover:bg-gray-700    /* Darker on hover */
        focus:outline-none   /* Remove focus outline for better UX */
        focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50 /* Focus ring for accessibility */
      "
      >
        <ChevronLeft size={24} className="mr-2" /> {/* Adjust size as needed, mr-2 for right margin */}
        <span className="text-base font-bold">Back</span>
      </div>
    </>
  );
};

export default BackButton;