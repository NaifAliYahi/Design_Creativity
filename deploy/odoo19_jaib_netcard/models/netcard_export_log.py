# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class NetcardExportLog(models.Model):
    """سجل تصدير بطاقة — اختياري للتقارير (بدون تخزين صورة كاملة إن لم تُرَد)."""

    _name = "netcard.export.log"
    _description = "Netcard Export Log"
    _order = "create_date desc"

    network_name = fields.Char(string="اسم الشبكة", required=True)
    network_code = fields.Char(string="رقم الكود", required=True, index=True)
    phone = fields.Char(string="رقم الهاتف", index=True)
    template_code = fields.Char(string="رمز القالب", index=True)
    template_id = fields.Many2one("netcard.template", ondelete="set null")
    custom_template_id = fields.Many2one("netcard.custom.template", ondelete="set null")
    user_id = fields.Many2one(
        "res.users",
        string="المستخدم",
        default=lambda self: self.env.user,
        index=True,
    )
    partner_id = fields.Many2one("res.partner", string="العميل", ondelete="set null")
    source = fields.Selection(
        [
            ("public_design", "رابط عام /design"),
            ("studio", "استوديو موظف"),
            ("api", "API"),
        ],
        string="المصدر",
        default="public_design",
        required=True,
    )
    company_id = fields.Many2one(
        "res.company",
        string="الشركة",
        default=lambda self: self.env.company,
        index=True,
    )
    note = fields.Char(string="ملاحظة")

    @api.model
    def log_export(self, vals):
        """استدعاء من controller OWL بعد تنزيل PNG."""
        allowed = {
            "network_name",
            "network_code",
            "phone",
            "template_code",
            "template_id",
            "custom_template_id",
            "partner_id",
            "source",
            "note",
        }
        clean = {k: v for k, v in vals.items() if k in allowed and v is not None}
        if self.env.user and not self.env.user._is_public():
            clean.setdefault("user_id", self.env.user.id)
        return self.sudo().create(clean)
