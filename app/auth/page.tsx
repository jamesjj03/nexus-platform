
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AuthPage() {

  const [email, setEmail] = useState('')

  async function signIn() {

    if (!supabase) {
      alert("Supabase is not connected yet.")
      return
    }

    await supabase.auth.signInWithOtp({
      email
    })

    alert('Magic link sent.')
  }

  return (
    <div
      style={{
        minHeight:'100vh',
        display:'grid',
        placeItems:'center',
        padding:'20px'
      }}
    >

      <div className="ff-card" style={{width:'100%',maxWidth:'460px'}}>

        <div className="ff-title" style={{fontSize:'40px'}}>
          Sign In
        </div>

        <p className="ff-card-text">
          Nexus authentication foundation.
        </p>

        <input
          className="ff-input"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <button
          className="ff-button"
          onClick={signIn}
        >
          Send Magic Link
        </button>

      </div>

    </div>
  )
}
