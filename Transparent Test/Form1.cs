﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Transparent_Test
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
            this.BackColor = Color.LimeGreen;
            this.TransparencyKey = Color.LimeGreen;
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.None;
            this.TopMost = true;
        }
    }
}
