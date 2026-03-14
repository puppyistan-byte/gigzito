import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, User, MapPin, Briefcase } from 'lucide-react';

// The "Digital Deck" - Rolodex Component
const Rolodex = () => {
  const [cards, setCards] = useState([]);
  const [filter, setFilter] = useState('intent'); // Default tab
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching from the "Vault" in Hillsboro via the Ashburn Switchboard
    const fetchCards = async () => {
      try {
        const response = await fetch(`/api/gigness-cards?filter=${filter}`);
        const data = await response.json();
        setCards(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load the Deck", err);
        setLoading(false);
      }
    };
    fetchCards();
  }, [filter]);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* 3-Tab Filter System */}
      <Tabs defaultValue="intent" onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="age">Age</TabsTrigger>
          <TabsTrigger value="gender">Gender</TabsTrigger>
          <TabsTrigger value="intent">Intent</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* The Cards Library */}
      <div className="space-y-4">
        {cards.map((card) => (
          <GignessCard key={card.id} data={card} />
        ))}
      </div>
    </div>
  );
};

// Individual Flipping Card Logic
const GignessCard = ({ data }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative w-full h-96 perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* SIDE A: The Slogan & Stats */}
        <Card className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white border-gold">
          <CardContent className="flex flex-col h-full p-6 justify-between">
            <div className="flex justify-between items-start">
              <Badge variant="outline" className="text-gold border-gold">GZ2 Vetted</Badge>
              {data.vetted && <ShieldCheck className="text-blue-400 w-6 h-6" />}
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold italic">"{data.slogan}"</h2>
              <p className="text-slate-400">{data.age} • {data.gender} • {data.intent}</p>
            </div>

            <div className="flex justify-around text-sm border-t border-slate-700 pt-4">
               <span className="flex items-center gap-1"><MapPin size={14}/> {data.distance}mi</span>
               <span className="flex items-center gap-1"><Briefcase size={14}/> {data.job}</span>
            </div>
          </CardContent>
        </Card>

        {/* SIDE B: The 6-Pic Gallery */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-100 overflow-hidden">
          <CardContent className="p-0 h-full grid grid-cols-2 grid-rows-3 gap-1">
            {data.photos?.slice(0, 6).map((url, i) => (
              <div key={i} className="bg-slate-300 bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
            ))}
            {!data.photos && <div className="col-span-2 row-span-3 flex items-center justify-center text-slate-400">Upgrade to GZ2 to see photos</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rolodex;
