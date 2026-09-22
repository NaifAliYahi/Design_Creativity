# -*- coding: utf-8 -*-
from odoo import fields, models, _


class NetcardCustomTemplate(models.Model):
    """قالب مستورد (PNG/JPG) — من عميل أو موظف."""

    _name = "netcard.custom.template"
    _description = "Netcard Custom Template"
    _order = "create_date desc"

    name = fields.Char(string="الاسم", required=True)
    image = fields.Image(
        string="الصورة",
        max_width=4096,
        max_height=4096,
        attachment=True,
        required=True,
    )
    thumb = fields.Image(
        string="معاينة",
        max_width=320,
        max_height=320,
        attachment=True,
    )
    image_filename = fields.Char(string="اسم الملف")
    partner_id = fields.Many2one(
        "res.partner",
        string="العميل",
        index=True,
        ondelete="set null",
    )
    user_id = fields.Many2one(
        "res.users",
        string="الموظف",
        default=lambda self: self.env.user,
        index=True,
        ondelete="set null",
    )
    session_key = fields.Char(
        string="مفتاح جلسة زائر",
        index=True,
        help="للزوار على /design بدون login — اختياري.",
    )
    layout_id = fields.Many2one(
        "netcard.template.layout",
        string="تخطيط الليبلات",
        ondelete="set null",
    )
    company_id = fields.Many2one(
        "res.company",
        string="الشركة",
        default=lambda self: self.env.company,
        index=True,
    )
    active = fields.Boolean(default=True)

    def action_create_layout(self):
        self.ensure_one()
        if not self.layout_id:
            layout = self.env["netcard.template.layout"].create(
                {
                    "name": self.name,
                    "custom_template_id": self.id,
                    "layers_json": [],
                }
            )
            self.layout_id = layout.id
        return {
            "type": "ir.actions.act_window",
            "name": _("تخطيط القالب المستورد"),
            "res_model": "netcard.template.layout",
            "res_id": self.layout_id.id,
            "view_mode": "form",
            "target": "current",
        }
