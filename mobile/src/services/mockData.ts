import {
  Amenity,
  ChatMessage,
  ChatThread,
} from '../types';

/**
 * Offline fixtures used by the service layer until the backend exists.
 * Services (not screens) import this file, so swapping to apiClient calls touches only services.
 */
export const mockAmenities: Amenity[] = [
  { icon: 'home-outline', label: 'Clubhouse' },
  { icon: 'water-outline', label: 'Swimming Pool' },
  { icon: 'barbell-outline', label: 'Gym' },
  { icon: 'happy-outline', label: 'Children Play Area' },
  { icon: 'leaf-outline', label: 'Landscaped Gardens' },
  { icon: 'shield-checkmark-outline', label: '24x7 Security' },
  { icon: 'flash-outline', label: 'Power Backup' },
  { icon: 'car-outline', label: 'Car Parking' },
  { icon: 'body-outline', label: 'Yoga Deck' },
  { icon: 'people-outline', label: 'Multipurpose Hall' },
];

export const mockChats: ChatThread[] = [
  { id: '1', name: 'Skyline Heights', role: 'Project Expert', lastMessage: 'Hi Rahul, Thank you for your…', time: '10:30 AM', unread: true },
  { id: '2', name: 'Green Valley Residences', role: 'Project Expert', lastMessage: 'Sure, Let me share the details…', time: 'Yesterday', unread: true },
  { id: '3', name: 'Urban Elite', role: 'Project Expert', lastMessage: 'Please find attached the floor…', time: 'Yesterday' },
  { id: '4', name: 'Lotus Park View', role: 'Project Expert', lastMessage: 'Let me know if you need any…', time: '2 Days ago' },
  { id: '5', name: 'Customer Support', role: 'Support Team', lastMessage: 'How can we help you today?', time: '2 Days ago' },
  { id: '6', name: 'Dream City Homes', role: 'Project Expert', lastMessage: 'Thank you for showing interest…', time: '3 Days ago' },
];

export const mockMessages: ChatMessage[] = [
  { id: 'm1', fromMe: false, text: 'Hi Rahul! 👋 Thank you for showing interest in Skyline Heights. How can I help you today?', time: '10:28 AM' },
  { id: 'm2', fromMe: true, text: "Hi, I'm interested in 2 BHK apartments. Can you share more details about pricing and availability?", time: '10:29 AM' },
  { id: 'm3', fromMe: false, text: 'Sure! Please find the details below. 2 BHK • 1200 sq.ft. • East Facing • ₹1.25 Cr* Onwards', time: '10:30 AM' },
  { id: 'm4', fromMe: false, text: 'Let me know if you would like to schedule a site visit.', time: '10:31 AM' },
  { id: 'm5', fromMe: true, text: 'Yes, please schedule a visit for this weekend.', time: '10:32 AM' },
  { id: 'm6', fromMe: false, text: 'Great! I will share the available time slots with you.', time: '10:33 AM' },
];

