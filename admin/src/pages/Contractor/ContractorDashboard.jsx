import React, { useContext, useEffect, useState } from 'react';
import { ContractorContext } from '../../context/ContractorContext';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import EarningsBreakdown from './EarningsBreakdown'; // Import the EarningsBreakdown component
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const ContractorDashboard = () => {
  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment } = useContext(ContractorContext);
  const { slotDateFormat, currency } = useContext(AppContext);

  const [currentChat, setCurrentChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [showEarningsModal, setShowEarningsModal] = useState(false);

  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    if (dToken) getDashData();
  }, [dToken]);

  // Open chat and listen for messages
  const openChat = (appointment) => {
    setCurrentChat(appointment);

    const q = query(
      collection(db, "chats", appointment._id, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChatMessages(snapshot.docs.map((doc) => doc.data()));
    });

    return () => unsubscribe();
  };

  // Send message to Firestore
  const sendMessage = async () => {
    if (!message.trim() || !currentChat) return;

    await addDoc(collection(db, "chats", currentChat._id, "messages"), {
      sender: "professional",
      message,
      timestamp: Date.now()
    });

    const receiverId = currentChat.userData.id;
    const unreadRef = doc(db, "unreadMessages", receiverId);
    await updateDoc(unreadRef, { unreadCount: increment(1) });

    setMessage('');
  };

  // Close chat
  const closeChat = () => {
    setCurrentChat(null);
    setChatMessages([]);
  };

  const goToAppointments = () => {
    navigate('/contractor-appointments'); // Navigate to the appointments page
  };

  return dashData && (
    <div className='m-5'>
      {/* Earnings, Appointments, Clients Stats */}
      <div className='flex flex-wrap gap-3'>
        <DashboardStat
          icon={assets.earning_icon}
          value={`${currency} ${dashData.earnings}`}
          label='Earnings'
          onClick={() => setShowEarningsModal(true)}
        />

        <DashboardStat
          icon={assets.appointments_icon}
          value={dashData.appointments}
          label='Appointments'
          onClick={goToAppointments} // Call the navigation function
        />
        <DashboardStat icon={assets.patients_icon} value={dashData.patients} label='Clients' />

      </div>
      {showEarningsModal && (
        <EarningsBreakdown
          onClose={() => setShowEarningsModal(false)}
          appointments={dashData.latestAppointments}
        />
      )}
      {/* Latest Bookings */}
      <div className='bg-white'>
        <div className='flex items-center gap-2.5 px-4 py-4 mt-10 rounded-t border'>
          <img src={assets.list_icon} alt='list' />
          <p className='font-semibold'>Latest Bookings</p>
        </div>

        <div className='pt-4 border border-t-0'>
          {dashData.latestAppointments.slice(0, 5).map((item, index) => (
            <div className='flex items-center px-6 py-3 gap-3 hover:bg-gray-100' key={index}>
              <img className='rounded-full w-10' src={item.userData.image} alt="" />
              <div className='flex-1 text-sm'>
                <p className='text-gray-800 font-medium'>{item.userData.name}</p>
                <p className='text-gray-600 '>Booking on {slotDateFormat(item.slotDate)}</p>
              </div>
              {item.cancelled ? (
                <p className='text-red-400 text-xs font-medium'>Cancelled</p>
              ) : item.isCompleted ? (
                <p className='text-green-500 text-xs font-medium'>Completed</p>
              ) : (
                <div className='flex gap-2'>
                  {/* Chat Now Button */}
                  <button onClick={() => openChat(item)} className='text-blue-500 border px-3 py-1 rounded'>Chat Now</button>
                  <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                  <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {currentChat && (
        <div className='fixed bottom-0 right-0 w-96 bg-white border shadow-lg p-4'>
          <div className='flex justify-between items-center mb-2'>
            <h2 className='text-lg font-semibold'>Chat with {currentChat.userData.name}</h2>
            <button onClick={closeChat} className='text-gray-500 hover:text-red-500'>✕</button>
          </div>

          {/* User Information */}
          <div className='mb-2'>
           <strong> <p className='text-sm text-gray-700'>
              Address: {currentChat.userData.address}
            </p>
            <p className='text-sm text-gray-700'>
              Contact: {currentChat.userData.phone}
            </p></strong>
          </div>

          <div className='overflow-y-auto h-64 border p-2 mb-2'>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`my-1 ${msg.sender === 'professional' ? 'text-right' : 'text-left'}`}>
                <p className='text-xs text-gray-400'>{new Date(msg.timestamp).toLocaleString()}</p>
                <p className='inline-block px-3 py-1 rounded bg-gray-200'>{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded p-2"
            />
            <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
              Send
            </button>
          </div>
        </div>

      )}
    </div>

  );
};


// Dashboard statistics card component
const DashboardStat = ({ icon, value, label, onClick, to }) => (
  <div
    onClick={onClick}
    className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'
  >
    <img className='w-14' src={icon} alt={label} />
    <div>
      <p className='text-xl font-semibold text-gray-600'>{value}</p>
      <p className='text-gray-400'>{label}</p>
    </div>
  </div>
);


export default ContractorDashboard;
