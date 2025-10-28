import showEye from '../assets/showEye.png';
import hideEye from '../assets/hideEye.png';

import { useState } from 'react';

function PasswordField({isConfirm=false, isToggleable=true, value="", onChange= ()=>{}, placeholder=""}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
    <div className="password-container">
        <input 
            name={isConfirm ? 'confirm' : 'password'} 
            type={showPassword? "text" : "password"} 
            placeholder={placeholder || (isConfirm ? 'Confirm Password' : 'Password')} 
            autoComplete="new-password" 
            required 
            minLength={6}
            onChange={(e) => onChange(e.target.value)}/>
        
        {isToggleable && (
            <button
                type="button"
                className="toggle-password"
                value={value}
                onClick={()=>setShowPassword((prev)=>!prev)}
            >
            <img
                src={showPassword ? hideEye : showEye}
                alt={showPassword ? "Hide Password" : "Show password"}
            />
            </button>
        )}
            
    </div>
    );
}

export default PasswordField;