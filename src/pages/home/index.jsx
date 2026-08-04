import { useState } from 'react';
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";


import styles from './index.module.css';

function Home() {
  return (
    <div className={styles.container}>

      

      <h1>Bem-vindo à Hamburgueria!</h1>

      
    </div>
  )
}

export default Home;